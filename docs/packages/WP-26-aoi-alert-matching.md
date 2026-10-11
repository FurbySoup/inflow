# WP-26 — Alerts match the AOI by polygon, not only by state
Wave 8 · Depends on prep P8a (`src/lib/geo.ts`, 52-code `statesInBbox`) · ADRs: 0003, **0016**, 0012, 0014

## Goal
A storm-based warning (polygon geometry) belongs to the AOI only when its polygon shares area with the AOI bbox. Today every alert matches by state, so a TOR in the Florida Keys shows, toasts and drives the threat button while the map is on Tallahassee. Zone-based alerts (geometry `null`, mostly watches) keep matching by state.
Also folds in two Wave 7 follow-ups on the same files: the threat button's accessible name, and feedback on a zone-only press.

## Owns
- New `src/panels/aoiMatch.ts` + `aoiMatch.test.ts`.
- `src/panels/AlertsList.tsx`, `src/panels/threat.ts` (+ `threat.test.ts`), `src/panels/ThreatButton.tsx`, `src/panels/newAlerts.ts` (+ `newAlerts.test.ts`), `src/panels/ToastRegion.tsx` (+ new `ToastRegion.test.tsx`).

## Forbidden
`src/lib/*` (use `bboxIntersectsGeometry` from `src/lib/geo.ts` read-only), `src/state/*`, `src/ui/*`, `src/map/*` (the watch-outline layer keeps its state filter), other panels.

## Build
- **`aoiMatch.ts`** (pure):
  - `alertInAoi(alert, aoi: { bbox: Bbox; states: readonly string[] }): boolean`;
  - polygon or multipolygon geometry → `bboxIntersectsGeometry(aoi.bbox, alert.geometry)`;
  - `geometry === null` → `alert.states.some((s) => aoi.states.includes(s))`.
- **Use it everywhere an alert is matched to the AOI:**
  - the `AlertsList` filter;
  - `threatSummary(alerts, aoi, now)` (change the signature from `aoiStates`);
  - `diffNewTornadoWarnings(seen, alerts, aoi)`;
  - the call sites in `ThreatButton` and `ToastRegion`. Each reads `bbox` and `states` from `useAoi`.
- **Threat button (Wave 7 follow-ups):**
  - WCAG 2.5.3: the accessible name must start with the visible text, e.g. `aria-label="2 tornado warnings, focus most severe"` (singular for 1). Or drop `aria-label` and give the ⌖ glyph a visually-hidden "focus most severe" suffix.
  - Zone-only press: when the target has no polygon (`geometryBbox` is null), pressing must still give visible feedback. Show a `threat-note` span reading `ZONE ALERT · NO POLYGON` for 3 s, with `role="status"`. Style it in `src/panels/threat.css` (owned through ThreatButton), tokens only.

## Acceptance
- [ ] `aoiMatch.test.ts`:
  - a polygon inside the bbox matches;
  - a polygon in the same state but outside the bbox doesn't;
  - a polygon straddling the bbox edge matches;
  - a null-geometry watch matches by state;
  - a MultiPolygon with one part inside matches.
- [ ] `threat.test.ts` and `newAlerts.test.ts` updated to the new signatures, with one case each for "same state, polygon outside the AOI → excluded".
- [ ] `ToastRegion.test.tsx` (Wave 7 follow-up):
  - a new TOR toast appears without moving focus out of a focused `<input>` (isTyping);
  - ⌖ FOCUS MAP calls `setFocus`;
  - stub `useSource`'s data with `vi.mock('../lib/useSource')`.
- [ ] A threat-button test (render) checks that the accessible name starts with the visible count text.
- [ ] Orchestrator live check: on the default AOI, zoom to a quarter of GA; alerts outside the view drop from the list unless zone-based. Then do the 390×844 matrix row.
- [ ] `npm run typecheck && npm run lint && npm test` pass.
