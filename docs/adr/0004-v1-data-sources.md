# 0004. v1 data sources (US, keyless)
Status: Accepted
Date: 2026-10-10

## Context
v1 must work with no API keys (ADR-0001) and US coverage only. Endpoints were verified with curl/browser on 2026-10-10 (Origin `http://localhost:5173`). Testing was from a UK egress, so some US WAF/geo-blocked results are marked UNVERIFIED.

## Decision

| Feed | Endpoint | Format | CORS | Cadence | Notes |
|---|---|---|---|---|---|
| NWS alerts | `api.weather.gov/alerts/active` | GeoJSON | `*` | 60 s | 403 without User-Agent; browsers send one, proxy adds an identifying UA. Watches have `geometry: null` — use `geocode.UGC`. |
| Radar | IEM `mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913/{z}/{x}/{y}.png` | XYZ PNG | `*` | 5 min | Past frames: `nexrad-n0q-900913-m05m`, `-m10m`…; frame time: `/data/gis/images/4326/USCOMP/n0q_0.json`. |
| Satellite | IEM `goes_east_conus_ch13` / `goes-east-ir-4km-900913` tiles; fallback nowCOAST WMS `nowcoast.noaa.gov/geoserver/satellite/wms` | XYZ / WMS PNG | `*` | 5–15 min | NASA/NOAA GOES-East; keyless. |
| SPC outlook | `spc.noaa.gov/products/outlook/day1otlk_cat.nolyr.geojson` | GeoJSON | `*` | 120 s | Public domain. |
| SPC reports | `spc.noaa.gov/climo/reports/today.csv` | CSV | `*` | 300 s | One file, three header sections (tornado/wind/hail) — split on header lines. |
| Streams | `youtube.com/embed/live_stream?channel=ID` or `/embed/{videoId}` | iframe | n/a | live | Error 153 if no Referer — never set `referrerpolicy="no-referrer"`. |
| Scanner | `api.openmhz.com/systems`, `/{shortName}/calls` | JSON (mp3 urls) | allowed in browser | live | Cloudflare challenges curl/server fetch → call from browser. Systems come from the live list, filtered by AOI state (WP-27; the curated `config/audio.json` is gone). |
| CB / ham | KiwiSDR directory `rx.linkfanel.net/kiwisdr_com.js` | JS array w/ GPS | none → proxy | 30 min | Receivers mostly plain HTTP → link-out, not iframe (mixed content once hosted). URL preset `?f=27185am` UNVERIFIED. |
| Cameras KS/NE | CARS GraphQL `POST {kandrive.gov,511.nebraska.gov}/api/graphql` (`mapFeaturesQuery`, `layerSlugs:["normalCameras"]`, bbox) | JSON | **POST preflight rejected** → proxy `/api/kandrive`, `/api/ne511` | 5 min | Same code for both states. Query at zoom ≥ 9 or results come back as clusters. ~44 KS views have `url:null` — skip. Snapshot URLs may carry query strings. |
| Cameras TX | `its.txdot.gov/its/DistrictIts/GetCctvStatusListByDistrict?districtCode=…`, snapshot `GetCctvSnapshotByIcdId` | JSON (base64 JPEG) | none → proxy | 5 min | Per-district calls. |

**Rejected / deferred for v1**
- RainViewer: now "personal and educational use only", max zoom 7, satellite removed. IEM is primary.
- Oklahoma (oktraffic.org): Cloudflare-blocked during verification. Revisit from a US network.
- Broadcastify: paid licence for API/embeds (ADR-0006).
- Spotter Network positions: requires a data agreement. Lightning (Blitzortung): restrictive terms. Roadmap.
- GA/SC DOT cameras (511GA, SC511): out of the Plains-core v1 scope, but the live-proofing storm is there. First post-v1 camera adapters.

## Corrections
- 2026-10-10 (WP-07): CARS GraphQL sends `Access-Control-Allow-Origin` only for same-origin/simple requests; JSON POSTs from localhost fail preflight. Moved behind the dev proxy.
- 2026-10-10 (WP-02): IEM `n0q_0.json` valid time is at `meta.valid`.
- 2026-10-10 (WP-06): KiwiSDR directory is JS with a trailing comma (not valid JSON); `bands` is Hz `"min-max"`; only ~2 of ~870 receivers cover 144 MHz.
- 2026-10-11 (Wave 8 re-verification; curl from a UK egress, plus the browser pane for OpenMHz):
  - **OpenMHz** `GET /systems` → `{success, systems[]}`: 465 systems, 452 with a 2-letter `state`, 41 states. It works cross-origin from a browser (fetched from example.com). curl gets a 403 only with its default User-Agent. Browser-direct stays the rule.
  - **CARS IA/MN/IN** (`511ia.org`, `511mn.org`, `511in.org`): same query, preflight fails → proxied. Zoom without clusters: MN 9, IA ≥ 11 (then capped at 100 per response), IN ≥ 13.
  - **IBI 511** AZ/ID/AK/LA/CT/NV/PA/New England: same list shape as GA/FL, no CORS → proxied. 511PA and New England 511 snapshots send ACAO twice, so use plain `<img>` only.
  - **WSDOT**: keyless ArcGIS `data.wsdot.wa.gov/arcgis/rest/services/TravelInformation/TravelInfoCamerasWeather/FeatureServer/0/query` echoes the origin. **Caltrans** CWWP2 `cctvStatusD{NN}.json`: CORS `*`, every value a string.
  - **SPC:** `day3otlk_sigprob` is stale (last issued March 2026); use `day3otlk_cigprob`. `day1otlk_torn` now carries CIG features (`LABEL` `CIG1`…). An empty day is one `DN: 0` feature with an empty GeometryCollection.
  - **IEM** answers an invalid tile layer with a 200 error PNG, so check layer names by looking at the tile.

## Consequences
- Terms for IEM, OpenMHz, DOT feeds are UNVERIFIED for redistribution. Fine for local use; must be reviewed before public hosting (roadmap gate).
- Every source has an attribution string shown in the UI (map attribution or panel footer).
