# WP-13 — SPC mesoscale discussions + watch boxes
Wave 4 · ADRs: 0002, 0004, 0008, 0014

## Goal
Two map overlays: active SPC **mesoscale discussions** (MD polygons) and active **watch boxes** (the SPC parallelograms, e.g. Tornado Watch 679), each labelled with its number.

## Owns
`src/sources/iemspc/**`, `src/map/spcMesoscale.ts`, `src/map/spcWatches.ts`.
Registry edit allowed: `src/map/layers.ts`. Add both layers **after** `radarLayer` (watch boxes above MDs). The orchestrator resolves the one-line conflict with WP-14.

## Forbidden
Everything else (no MapPanel, no panels, no proxy; none is needed).

## Verified facts (2026-10-10, curl)
- **MDs:** `GET https://mesonet.agron.iastate.edu/api/1/nws/spc_mcd.geojson` → 200, `ACAO:*`, ~1–3 KB. Polygon features `{ product_id, num, issue, expire, watch_confidence, concerning }` (e.g. `num: 2357`, `concerning: "SEVERE POTENTIAL...WATCH UNLIKELY"`).
- **Watch boxes:** `GET https://mesonet.agron.iastate.edu/api/1/spc_watch_outline.geojson` → 200, `ACAO:*`. MultiPolygon features `{ sel, type: "TOR"|"SVR", num, utc_issued, utc_expired }`.
- Richer watch info (optional): `GET https://mesonet.agron.iastate.edu/json/spcwatch.py` → 200, `ACAO:*`, adds `max_hail_size`, `max_wind_gust_knots`, `is_pds`, `spcurl`.
- Old paths `/geojson/spc_mcd.geojson`, `/geojson/spc_watches.geojson` 301 to `/api/`; use `/api/1/…` directly. SPC's own KMZ is zipped KML; don't use it.
- Rate limits: UNVERIFIED. Poll every 2–5 min.

## Build
- Adapters in `src/sources/iemspc/`: `spcMesoscale` and `spcWatchBoxes`, each with `fetch` + pure `normalize` → GeoJSON features with trimmed properties (`num`, `label`, `expires`, `kind`). Drop expired items in `normalize` by comparing to a **`now` argument**, not the clock (WP-01 failed purity on that).
- Layers follow the `spcOutlook.ts` pattern (load on add, keep the last good data on failure, `refreshMs` 180 s):
  - MDs: thin dashed line + very light fill, label `MD 2357` (symbol layer, `--font-data`-like font from the existing glyphs; if the style has no glyphs, skip the label and report).
  - Watches: solid outline, colour by type (TOR red, SVR yellow; MapLibre paint values may be literal colours per CLAUDE.md), label `TOR 679` / `SVR 680`, PDS gets a thicker line.
- Layer `id`s prefixed `spc-md` / `spc-watch` so the LayerControl toggles every sub-layer.
- Commit trimmed real fixtures for both endpoints.

## Responsive (ADR-0014)
- Labels use `text-allow-overlap: false` and a size that stays legible at 390 px wide (≈11–12 px) without cluttering 3840 px. The map's own zoom handles scale, so no media queries are needed.
- Orchestrator checks: labels readable at 390×844 and 3840×2160; no label pile-ups at zoom ≤ 5.

## Acceptance
- [ ] Tests: normalize for both (expiry filter with injected `now`, label building, TOR/SVR mapping).
- [ ] Both rows appear in the layer control and toggle.
- [ ] Orchestrator live check: active watch boxes / MDs draw in the right place (compare with spc.noaa.gov).
- [ ] `npm run typecheck && npm run lint && npm test` pass.
