# WP-11 — AOI presets (Plains / Dixie Alley / Southeast)
Wave 4 · Depends on orchestrator prep P1 (`aoiRequest`) · ADRs: 0003, 0007, 0012

## Goal
A top-bar preset group that moves the map to a named region in one click: `PLAINS`, `DIXIE`, `SE`.

## Owns
`src/panels/AoiPresets.tsx`, `src/panels/AoiPresets.test.ts`.
Registry edit allowed: one line in `src/panels/Topbar.tsx` placing `<AoiPresets />` after the AOI readout.

## Forbidden
Everything else, including `src/state/aoi.ts` (prep P1 already adds `requestAoi`) and `MapPanel.tsx` (prep P1 already consumes the request). Use `ConsoleButton` from `src/ui`, not raw buttons.

## Verified facts
- After prep P1, `useAoi` exposes `requestAoi(bbox: Bbox)`. MapPanel `fitBounds` to it. The resulting `moveend` then writes the real `bbox`/`states` as today.
- `statesInBbox(bbox)` in `src/lib/states.ts` derives state codes from a bbox. Use it to compute which preset is active.

## Build
- `export const AOI_PRESETS` (pure data, exported for tests):
  - `PLAINS` `{west:-104, south:32, east:-94, north:43}`;
  - `DIXIE` `{west:-94.5, south:30, east:-84, north:36.5}`;
  - `SE` = the current `DEFAULT_AOI` (GA/SC).
- Render a `ConsoleButton` per preset; click → `requestAoi(preset.bbox)`.
- Feedback (ADR-0012): `aria-pressed` on the preset whose state set equals `useAoi().states` (pure helper `activePreset(states)`). Panning away clears it, which is honest because the AOI no longer matches.
- `aria-label` per button with the region name (e.g. "Move map to the Southern Plains").

## Acceptance
- [ ] Unit test: `activePreset` matches exact state sets and returns null otherwise.
- [ ] Live (orchestrator): click `PLAINS` → map moves, AOI readout shows KS/OK/NE…, the CCTV panel shows KS cameras; click `SE` → back to GA/SC.
- [ ] Keyboard: Tab reaches each button, `:focus-visible` ring shows, Enter applies.
- [ ] Checks pass.
