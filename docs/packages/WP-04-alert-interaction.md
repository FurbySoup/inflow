# WP-04 — Alert interaction
Wave 2 · ADRs: 0003, 0007 · **Prereq (orchestrator):** `useAoi` gains `focus: { id: string; bbox: Bbox } | null` and `setFocus()`.

## Goal
Make alerts actionable: click an alert in the list → map flies to it and highlights it; click a polygon on the map → list scrolls to and highlights it; show time remaining.

## Owns
`src/panels/AlertsList.tsx`, `src/panels/MapPanel.tsx`.

## Forbidden
Everything else (store changes are the prereq above — if missing, stop and report).

## Build
- List item click → compute bbox of alert geometry → `setFocus`. Zone-based alerts (null geometry) are not clickable for focus; show them with a `ZONE` tag.
- MapPanel: on `focus` change → `fitBounds` with padding; draw a highlight line layer `alerts-focus` (width 4, `--accent` colour value `#36c5f0`).
- Map: click on `alerts-fill` → `setFocus` for that feature (add `id` to feature properties).
- List: `T-mm:ss` remaining until `expires` in `--font-data`, red under 10 min. Expired alerts drop out.
- Tornado warnings with `PDS`/`emergency` in headline get a flashing border (respect reduced motion).

## Acceptance
- [ ] Both click directions work against live data.
- [ ] Unit test for bbox-of-geometry helper (place it in `AlertsList.tsx` export or a colocated file you own: `src/panels/alertGeometry.ts`).
- [ ] Checks pass.
