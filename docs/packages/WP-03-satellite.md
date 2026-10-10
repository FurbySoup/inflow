# WP-03 — GOES-East satellite layer
Wave 1 · ADRs: 0004, 0008

## Goal
NOAA/NASA GOES-East infrared imagery as a map layer beneath radar — the "view from space" of the storm tops.

## Owns
`src/map/satellite.ts`, `src/sources/satellite/**`.
Registry edit allowed: add `satelliteLayer` to `mapLayers` in `src/map/layers.ts` **first** (bottom-most).

## Forbidden
Everything else.

## Verified facts (2026-10-10)
- IEM tile cache layers (keyless, CORS `*`): `goes_east_conus_ch13` and `goes-east-ir-4km-900913`, pattern `https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/{layer}/{z}/{x}/{y}.png`. Invalid names 404, so the two names above are confirmed.
- Fallback: nowCOAST WMS `https://nowcoast.noaa.gov/geoserver/satellite/wms`, layer `goes_longwave_imagery`, EPSG:3857 GetMap works (CORS `*`). MapLibre raster source supports WMS via `tiles: ['...&bbox={bbox-epsg-3857}&...']`.

## Build
- Raster layer `id: 'satellite'`, opacity ~0.55, default **visible**. Prefer `goes_east_conus_ch13` (clean IR); fall back to nowCOAST if tiles fail (listen for MapLibre `error` events with `sourceId === 'satellite'` and swap tiles once).
- `refreshMs` 10 min with cache-busting (mirror `src/map/radar.ts`).
- Attribution string on the source: `GOES-East via IEM / NOAA`.

## Acceptance
- [ ] Satellite visible beneath radar over GA/SC; radar and alerts remain readable.
- [ ] Fallback path covered by a unit test of the URL builder.
- [ ] Checks pass.
