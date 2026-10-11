# WP-18 — Single-site radar: storm-relative velocity + "Open in WeatherWise"
Wave 6 · Depends on prep P6 (`MapLayer.defaultVisible`) · ADRs: 0002, 0004, 0008, 0012, 0014

## Goal
Chasers read **storm-relative velocity (SRV)** from the nearest single radar, not the reflectivity mosaic. Add an SRV layer for the radar site nearest the AOI centre, a small on-map site readout, and a link-out that opens the same site and product in WeatherWise (the app chasers use; it can't be embedded or used as a data source).

## Owns
`src/sources/nexrad/**` (site list + nearest-site + IEM RIDGE helpers), `src/map/velocity.ts` (layer + its on-map control), `src/map/velocity.test.ts` if the layer has pure helpers.
Registry edits allowed:
- `src/map/layers.ts`: add `velocityLayer` right **after** `radarLayer`.
- `src/panels/shortcuts.ts`: add `V` → toggle `velocity` to the layer keys, plus one help row in `KeyboardShortcuts.tsx` (`V · Toggle velocity`).

## Forbidden
Everything else, including `src/ui/*`, `src/state/*`, `MapPanel.tsx`. No proxy (none needed). No WeatherWise endpoints other than the outbound link.

## Verified facts (2026-10-11, curl, `Origin: http://localhost:5173`)
- **Site list:** `GET https://mesonet.agron.iastate.edu/geojson/network/NEXRAD.geojson` → 200, `ACAO:*`, 86 KB, 160 features. `properties.sid` = 3-letter IEM id (e.g. `FFC` at [-84.57, 33.36]); `online: true`. Fetch once per session.
- **SRV tiles:** `https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::{SID}-N0S-0/{z}/{x}/{y}.png` → 200 at z8/10/12, `ACAO:*`, `Cache-Control: max-age=300`, ~0.33 s. Above z10 tiles are upscaled.
- **Freshness:** `GET https://mesonet.agron.iastate.edu/json/ridge_current.py?product=N0S` → `meta[]` with per-site `valid` (e.g. FFC 15:18:38Z), 160 sites. **IEM keeps serving stale products with 200** (N0U/N0Q stale since 2023). Show a site as stale and badge it if `valid` is over 20 min old.
- Don't use N0U, N0Q (stale) or N0G (no IEM sites). The NWS GeoServer (`opengeo.ncep.noaa.gov/geoserver/k{site}/ows`, layer `k{site}_sr_bvel`) has *base* velocity only, not SRV. Record it as a future fallback, don't build it.
- **WeatherWise link** (from its web bundle; **UNVERIFIED in a browser**, so the orchestrator live-checks it): `https://web.weatherwise.app/#m=RADAR&rt=K{SID}&rp=N0S&map=8/{lat}/{lon}`. `rt` is the 4-letter ICAO id: `K` + sid for the lower 48. For sites outside the lower 48 (P/T prefixes), hide the link. It can't be framed (CSP). The EULA restricts commercial use, so a plain outbound link is fine for v1.

## Build
- `src/sources/nexrad/`:
  - `sites.ts`: adapter or fetcher for NEXRAD.geojson, plus pure `normalizeSites(raw)` → `{ sid, name, location: LngLat }[]` (online only).
  - pure `nearestSite(sites, lngLat)` (great-circle distance).
  - pure `srvTileUrl(sid)` and `weatherWiseUrl(site)` (null outside the lower 48).
  - pure `siteValid(meta, sid)` → ISO | null.
  - Commit trimmed real fixtures for both JSON endpoints.
- `velocityLayer` (`id: 'velocity'`, `label: 'Velocity (SRV, nearest radar)'`, `defaultVisible: false`):
  - raster source + layer `velocity`, opacity ≈ 0.78 (INFLOW `--map-radar-opacity`), drawn just above the reflectivity frames.
  - Site choice follows the AOI: read `useAoi.getState().bbox` centre on `refresh` (every 120 s) and also subscribe to `useAoi` so a pan that changes the nearest site swaps the tile URL (`setTiles`), with a debounce of about 1 s.
  - Cache-bust on refresh like `radarLayer.refresh`.
- On-map control (added by the layer, `bottom-left`, like the radar loop control):
  - read-only readout `SRV · KFFC · 15:18Z` in `--font-data`, with stale shown in sand (`--status-stale`) and the prefix `◐`;
  - a link-out `WEATHERWISE ↗` (`target="_blank" rel="noopener noreferrer"`, title "Open KFFC velocity in WeatherWise").
  - Style with existing classes/tokens only (`btn-console` for the link, `--surface-scrim` background). The readout must not look clickable (ADR-0012).
  - The control stays visible when the layer is off (the link is useful on its own) and shows `KFFC` regardless.

## Responsive (ADR-0014)
- The control must fit at 390 px beside the radar loop control. If space is short, the readout can drop the time but never the link.

## Acceptance
- [ ] Tests:
  - site normalize;
  - `nearestSite` (GA centre → FFC; Oklahoma City → TLX);
  - `weatherWiseUrl` (K-prefix; null for an Alaska site);
  - `siteValid` + the stale threshold;
  - URL builders.
- [ ] Layer row "Velocity (SRV, nearest radar)" starts **off**; `V` toggles it; state persists.
- [ ] Orchestrator live check:
  - velocity tiles draw over GA from FFC;
  - DIXIE / PLAINS presets switch the site (e.g. to a MS or OK radar);
  - the readout time matches `ridge_current.py`;
  - the WeatherWise link opens KFFC velocity in a new tab.
- [ ] `npm run typecheck && npm run lint && npm test` pass.
