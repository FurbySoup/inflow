# WP-30 — DOT cameras: Washington (WSDOT) + California (Caltrans)
Wave 8 · Depends on prep P8a (`stateAt`), P8c (`CAMERA_SOURCES`) · ADRs: 0002, 0004, 0005, 0014, **0016**

## Goal
West Coast cameras. Both sources are CORS-open, so there's **no proxy**.

## Owns
New `src/sources/wsdot/**` and `src/sources/caltrans/**`.
Registry edit allowed: append to `CAMERA_SOURCES` in `src/panels/CamerasPanel.tsx`:

```ts
{ adapter: washingtonCameras, states: ['WA'], attribution: 'WSDOT' },
{ adapter: californiaCameras, states: ['CA'], attribution: 'Caltrans' },
```

## Forbidden
`vite.config.ts`, the rest of `CamerasPanel.tsx`, `src/lib/*` (call `stateAt` read-only), `src/state/*`, `src/ui/*`, `src/types/index.ts`.

## Verified facts (2026-10-11, curl)
- **WSDOT (keyless ArcGIS):**
  - `GET https://data.wsdot.wa.gov/arcgis/rest/services/TravelInformation/TravelInfoCamerasWeather/FeatureServer/0/query?where=1%3D1&outFields=CameraTitle,ImageURL&outSR=4326&f=geojson` → 200 `application/geo+json`.
  - ACAO echoes the origin; no key.
  - It returns 1706 Point features (`maxRecordCount` 2000, so one request gets everything). Properties: `OBJECTID`, `CameraTitle`, `ImageURL`, `CompassDirection`.
  - Image hosts: `images.wsdot.wa.gov` (1631; 200 image/jpeg, no ACAO, fine for `<img>`), `tripcheck.com` (65 Oregon border cameras) and 5 others.
- **Caltrans CWWP2:**
  - `GET https://cwwp2.dot.ca.gov/data/d{N}/cctv/cctvStatusD{NN}.json` for N = 1…12 (D7 → `d7/cctvStatusD07.json`). ACAO `*`, no key.
  - Shape: `{ data: [{ cctv: { index, location: { district, locationName, nearbyPlace, longitude, latitude, county, route }, inService, imageData: { streamingVideoURL, static: { currentImageURL, currentImageUpdateFrequency } } } }] }`.
  - **Every value is a string**, including the coordinates and `inService` (`"true"`).
  - 3591 cameras in total. Files are 69 KB to **2.4 MB (D04)**. `currentImageURL` → 200 jpeg, ACAO `*`.
  - `recordTimestamp` is often stale, and some `county` values are wrong, so don't rely on either.

## Build
- **`wsdot/adapter.ts`, `washingtonCameras`** (`refreshMs` 60 s):
  - `fetch` caches the full list for 12 h in module memory (pattern: `src/sources/ibi511/adapter.ts`; a failure is not cached) and returns `{ aoi, features }`.
  - Pure `normalize` keeps Points in the AOI bbox and maps them to `CameraFeed`:
    - id `wsdot:<OBJECTID>`;
    - `title` = `CameraTitle`;
    - `snapshotUrl` = `ImageURL`, only when it starts with `https://` (drop the rest; mixed content);
    - `state` = `stateAt(lng, lat) ?? 'WA'`, so the Oregon cameras say OR.
- **`caltrans/adapter.ts`, `californiaCameras`** (`refreshMs` 60 s):
  - A committed `DISTRICT_BBOXES: Record<number, Bbox>`, computed by you from the 12 real files (min/max of the in-service coordinates plus 0.1°). Note the date in a comment.
  - `fetch` loads only the districts whose bbox overlaps the AOI, each cached 12 h independently.
  - `normalize` keeps `inService === 'true'`, parses the numbers, drops non-finite or (0, 0) ones, keeps those in the AOI, and needs an `https://` `currentImageURL`. Then:
    - id `caltrans:<district>-<index>`;
    - `title` = `locationName`;
    - `state: 'CA'`.
- **Fixtures:**
  - WSDOT: 4 features, including a tripcheck.com one and one with an `http://` image if any exists.
  - Caltrans: 4 cameras from **one small district** (D9, about 23 cameras), with one `inService: "false"` (edit it if none, and say so). **Never commit the 2.4 MB file.**

## Acceptance
- [ ] Tests:
  - WSDOT bbox filter and Oregon tagging;
  - Caltrans string parsing and the inService filter;
  - only the overlapping districts are fetched (mock `fetch`, count the URLs);
  - the 12 h cache.
- [ ] Orchestrator live check: pan to Seattle and to LA; snapshots render; the Network tab shows only D7 (plus neighbours) for LA.
- [ ] `npm run typecheck && npm run lint && npm test` pass.
