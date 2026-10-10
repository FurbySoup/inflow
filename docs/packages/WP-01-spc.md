# WP-01 — SPC convective outlook + storm reports
Wave 1 · ADRs: 0002, 0004, 0007, 0008

## Goal
Two map layers: SPC Day 1 categorical outlook (filled risk areas, under radar) and today's storm reports (points: tornado/hail/wind).

## Owns
`src/sources/spc/**` (adapters, fixtures, tests), `src/map/spcOutlook.ts`, `src/map/stormReports.ts`.
Registry edit allowed: add both layers to `mapLayers` in `src/map/layers.ts` — outlook **before** `radarLayer`, reports **after**.

## Forbidden
Everything else. Use the existing `StormReport` type; if it is insufficient, stop and report.

## Verified facts (2026-10-10)
- Outlook: `GET https://www.spc.noaa.gov/products/outlook/day1otlk_cat.nolyr.geojson` — GeoJSON FeatureCollection, CORS `*`, cache 120 s. Features carry `LABEL` (TSTM, MRGL, SLGT, ENH, MDT, HIGH) and `fill`/`stroke` colors in properties.
- Reports: `GET https://www.spc.noaa.gov/climo/reports/today.csv` — CORS `*`, cache 300 s. **One file with three sections**, each beginning with its own header line: `Time,F_Scale,Location,County,State,Lat,Lon,Comments` (tornado), `Time,Speed,…` (wind), `Time,Size,…` (hail). Split on header lines; the header's 2nd column tells the kind. `Time` is `HHMM` UTC for the SPC day (12Z–12Z) — convert to ISO using today's UTC date.
- Fetch a real copy of each with curl and save trimmed versions to `src/sources/spc/fixtures/` for tests.

## Build
- `src/sources/spc/reports.ts`: `SourceAdapter<string, StormReport>`; `normalize` parses CSV (no new dependency — fields are simple, but `Comments` may contain commas: take columns 0–6 positionally, join the rest).
- `src/sources/spc/outlook.ts`: fetch + export the FeatureCollection as-is (it's a static GeoJSON layer; no shared type needed).
- Map layers: outlook as `fill` (opacity ~0.18, colour from feature `fill` property) + `line`; reports as `circle` with colour per kind (tornado `#ff3b3b`, wind `#36c5f0`, hail `#3ddc84`). Layers fetch on `add()` and on `refresh()` via `GeoJSONSource.setData`. MapLibre layer ids must start with the MapLayer `id`.

## Acceptance
- [ ] Outlook polygons visible under radar; reports visible as dots over it.
- [ ] `reports.test.ts` covers: three sections parsed, comment containing commas, empty sections (header with no rows).
- [ ] `npm run typecheck && npm run lint && npm test` pass.
