# WP-02 — Radar loop / timeline
Wave 1 · ADRs: 0004, 0007, 0008

## Goal
Animate the last ~50 minutes of NEXRAD composite with a play/pause control and frame timestamp, as a MapLibre control on the map.

## Owns
`src/map/radar.ts`, `src/map/radarLoop.ts`, `src/sources/radar/**`.

## Forbidden
Everything else (do not edit `MapPanel.tsx` or `layers.ts`). The control is added from inside `radarLayer.add(map)` via `map.addControl(...)`.

## Verified facts (2026-10-10)
- Current: `https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913/{z}/{x}/{y}.png`
- Past frames: same pattern with layer `nexrad-n0q-900913-m05m`, `-m10m`, … `-m50m` (5-minute steps).
- Current frame valid time: `GET https://mesonet.agron.iastate.edu/data/gis/images/4326/USCOMP/n0q_0.json` (JSON with valid time, UTC). CORS `*`.

## Build
- Keep a raster source per frame (11 sources, `radar-m50` … `radar-m00`), all `raster-opacity: 0` except the active frame — avoids re-downloading tiles while looping.
- `radarLoop.ts`: a class implementing `maplibregl.IControl` rendering `▶/❚❚`, a frame label `HH:MMZ` (valid time minus offset), and `LIVE` when on the newest frame. Style using existing CSS tokens via class names; add no new global CSS — inline styles referencing `var(--…)` are fine.
- Default state: paused on LIVE. Loop speed ~500 ms/frame, 1.5 s hold on newest.
- `refresh()` re-busts all frame sources (existing behaviour) and re-reads valid time.
- Keep `id: 'radar'`; all MapLibre layer ids start with `radar`.

## Acceptance
- [ ] Play animates 11 frames smoothly with no tile flashing after the first loop.
- [ ] Label shows correct UTC time per frame.
- [ ] Unit test for frame-time computation (pure function) in `src/sources/radar/`.
- [ ] Checks pass.
