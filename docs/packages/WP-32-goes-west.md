# WP-32 — GOES-West for western AOIs
Wave 8 · ADRs: 0002, 0003, 0008

## Goal
The satellite layer is GOES-East only, which is oblique and degraded over the West. Switch to GOES-West when the AOI centre is west of 105°W.

## Owns
`src/map/satellite.ts`, `src/sources/satellite/**` (+ tests).

## Forbidden
`src/map/layers.ts` (the layer object stays the same), `src/state/*` (subscribe read-only, as `src/map/velocity.ts` does), `src/lib/*`, `src/ui/*`.

## Verified facts (2026-10-11, curl + visual check)
- `https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/goes_west_conus_ch13/{z}/{x}/{y}.png` → 200 image/png, ACAO `*`. It's the same template as the existing `goes_east_conus_ch13`, and real IR imagery was checked by eye.
- **IEM returns 200 with a red "Invalid TMS Request" PNG for a wrong layer name**, so a status check proves nothing. Use the layer names above exactly.
- The nowCOAST WMS fallback (`goes_longwave_imagery`) is a mosaic and stays as the fallback for both sectors.

## Build
- **`goes.ts`:**
  - `type GoesSector = 'east' | 'west'`;
  - pure `goesSector(bbox)`: `'west'` when the centre longitude is < −105, else `'east'`;
  - `goesTileUrl(source, sector, cacheBust?)`;
  - `goesAttribution(sector)` → `GOES-East via IEM / NOAA` or `GOES-West via IEM / NOAA`.
- **`satellite.ts`:**
  - in `add`, subscribe to `useAoi` (bbox) and, when the sector changes, `setTiles` on the existing source. Don't remove or re-add it, so draw order is kept;
  - keep the nowCOAST fallback switch and the refresh cache-busting with the current sector;
  - the layer label becomes `GOES IR` (LayerControl shows it);
  - unsubscribe if the map is removed (`map.once('remove', …)`).
- Alaska and Hawaii are outside both CONUS sectors. That's out of scope; note it in a comment.

## Acceptance
- [ ] Tests: `goesSector` at −104.9, −105.1 and the default AOI; URL templates for both sectors (exact strings); the fallback URL is unchanged.
- [ ] Orchestrator live check: pan to Denver → Phoenix; the tile requests switch to `goes_west_conus_ch13`, and the layer stays under the radar.
- [ ] `npm run typecheck && npm run lint && npm test` pass.
