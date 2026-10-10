# 0003. Area of interest is the only cross-panel state
Status: Accepted
Date: 2026-10-10

## Context
The value of a single-pane view is that every panel shows the same place. Panels are built independently and must not depend on each other.

## Decision
- One Zustand store, `useAoi` (`src/state/aoi.ts`): `{ bbox, states, setAoi }`.
- The map is the only writer (on `moveend`). `states` is derived from the bbox via coarse state bounding boxes (`src/lib/states.ts`).
- Panels read it and filter: geometry-bearing items by bbox, everything else by `states`.
- Default AOI is GA/SC (live-proofing outbreak, 2026-10-10).
- Panels never import each other or share any other state. Cross-panel interactions (e.g. click an alert → fly the map) go through new fields on this store, added by the orchestrator.

## Consequences
- Zone-based NWS alerts (watches, null geometry) filter by UGC state code, which is coarse: a watch in north GA shows when viewing south GA.
- `STATE_BBOXES` is approximate and must be extended when new regions get coverage.
