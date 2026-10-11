# WP-31 — SPC outlooks Day 1–8 + AOI risk in the top bar
Wave 8 · Depends on prep P8a (`src/lib/geo.ts`) · ADRs: 0002, 0008, 0012, 0014, 0015 · Spec: HANDOFF.md §5 (top bar), §7 (map; SPC fill opacity)

## Goal
Answer "is there severe weather coming here, and when". The map's outlook layer gets a day selector (D1–D8), and the top bar shows the AOI's highest categorical risk for Days 1–3.

## Owns
- `src/sources/spc/outlook.ts` (+ test, fixtures), `src/map/spcOutlook.ts`.
- New: `src/map/outlookDay.ts` (+ test), `src/map/OutlookDayControl.ts`, `src/panels/OutlookRisk.tsx`, `src/panels/outlookRisk.ts` (+ test).

Registry edits allowed:
- one `addControl(new OutlookDayControl(), 'top-left')` line in `src/panels/MapPanel.tsx`, right after the LayerControl line;
- one `<OutlookRisk />` in `src/panels/Topbar.tsx`, after `<WarningsHiddenChip />`.

## Forbidden
`src/lib/*` (use `bboxIntersectsGeometry`), `src/state/*`, `src/ui/*`, `src/map/mapStyle.ts` (import `SPC_CATEGORY` read-only), `LayerControl.ts`, `src/index.css`.

## Verified facts (2026-10-11, curl; all CORS `*`, no key, `application/geo+json`)
- **Day 1–3 categorical:** `https://www.spc.noaa.gov/products/outlook/day{1,2,3}otlk_cat.nolyr.geojson`.
  - Properties: `DN, LABEL, LABEL2, VALID, EXPIRE, ISSUE` (`YYYYMMDDHHMM` UTC), `VALID_ISO, EXPIRE_ISO, ISSUE_ISO, FORECASTER, fill, stroke`.
  - Categorical LABEL values: `TSTM, MRGL, SLGT, ENH, MDT, HIGH`.
- **Day 4–8:** `https://www.spc.noaa.gov/products/exper/day4-8/day{4..8}prob.nolyr.geojson`. Same properties; `DN` is the probability in percent (15 or 30).
- **An empty day is NOT an empty FeatureCollection.** It's one feature with `geometry: { type: "GeometryCollection", geometries: [] }`, `DN: 0`, `fill: ""`. Its LABEL is text such as "Predictability Too Low" (D4–5) or "Potential Too Low" (D6–8). All five D4–8 files were empty on 2026-10-11. Drop these features in `normalize`.
- Don't use `day3otlk_sigprob` (stale since March 2026). Hazard-specific files (`_torn` now carries CIG features) are **out of scope**.

## Build
- **`outlook.ts`:**
  - `outlookUrl(day: 1..8)`;
  - `spcOutlookDay(day)` returns a memoized adapter per day, with ids `spc-outlook-d{n}` and `refreshMs` 120 s for D1–3 and 30 min for D4–8;
  - `normalize` drops the DN-0 or empty-geometry features;
  - keep `export const spcOutlook = spcOutlookDay(1)` for existing imports.
- **`outlookDay.ts`:** a tiny store, `getOutlookDay()`, `setOutlookDay(n)`, `subscribeOutlookDay(fn)`, default 1, in memory only. Use the `subscribeLayers` pattern in `LayerControl.ts`.
- **`spcOutlook.ts` layer:**
  - loads the selected day, re-loading when the day changes;
  - D1–3 use the existing `CATEGORY_COLOR`;
  - D4–8 colour by `DN`: 15 → `SPC_CATEGORY.SLGT`, 30 → `SPC_CATEGORY.ENH`. That's SPC's own convention, and both are token primitives (ADR-0015);
  - label `SPC Outlook`.
- **`OutlookDayControl.ts`** (MapLibre `IControl`, DOM only, tokens via inline `var(--…)` like LayerControl):
  - **The root element must have `className = 'maplibregl-ctrl'`.** MapLibre's corner containers are `pointer-events: none`, so without the class nothing in it is clickable. That was the user-reported WeatherWise bug, fixed in prep;
  - a row of 8 buttons `1`…`8` with class `btn-console`, `aria-pressed` on the selected one, a group `aria-label="SPC outlook day"`, and a caption `SPC D{n} · VALID {DDHHMM}Z–{DDHHMM}Z` from the loaded data (`—` when empty);
  - hidden while the `spc-outlook` layer is off (`isLayerOn` / `subscribeLayers`, read-only import);
  - starts collapsed to a `▸ SPC D1` head on narrow and short screens, the same `startCollapsed` rule as LayerControl (copy the media query; don't import a private function).
- **`outlookRisk.ts`** (pure):
  - `highestCategory(features, bbox)` returns the highest of TSTM < MRGL < SLGT < ENH < MDT < HIGH whose polygon intersects the bbox, or null;
  - `riskSummary(d1, d2, d3)` returns `{ day: 1|2|3, label }[]`: Day 1 always, plus Day 2 or 3 when higher than every earlier day.
- **`OutlookRisk.tsx`** (top bar, **read-only**, ADR-0012):
  - plain text, no border or button look: `SPC D1 SLGT`, then ` · D3 ENH` when a later day is higher;
  - the category word gets a small square swatch in `var(--p-spc-<cat>)`;
  - `SPC D1 —` when there's no risk; nothing while loading; `SPC ■ UNAVAILABLE` on error;
  - uses `useSource(spcOutlookDay(1..3))`;
  - must wrap or hide like the other `topbar-item`s at ≤ 1366 px (class `topbar-item`), with no new CSS outside your files. If you need a rule, put a `<style>`-free inline style on your element only.

## Acceptance
- [ ] Tests:
  - empty-day filtering (fixture: one real D4 empty file + one D1 cat trimmed to 3 features);
  - `highestCategory` with a polygon outside the bbox, a TSTM-only area, and MDT inside;
  - `riskSummary` ordering;
  - the day store's notify and unsubscribe.
- [ ] No fixed widths. Under `pointer: coarse` the day buttons get the kit touch size from `btn-console`.
- [ ] Orchestrator live check: D1→D3 switch the polygons; D4–8 are empty or shaded; the top bar reads correctly for the default AOI. Then the full ADR-0014 matrix (top bar at 1366 and 1024).
- [ ] `npm run typecheck && npm run lint && npm test` pass.
