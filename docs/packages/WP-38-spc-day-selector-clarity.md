# WP-38 — SPC day selector you can actually see working
Wave 9 · Fixes WP-31 · ADRs: 0008, 0012, 0014, 0015, 0018

## Goal
User report (2026-10-11): "I'm not sure how the D1–D8 functionality works, nothing happens when clicking." The code works (the store notifies, the layer reloads), but the feedback is invisible:
- the outlook draws **under** satellite and radar at 16% fill, so on a stormy day changing SLGT to TSTM-only barely shows;
- empty days (all of D4–D8 on 2026-10-11) just clear the map, with a caption of `—`;
- the buttons read `1 … 8` with no meaning.

Make every press produce obvious, explained feedback.

## Owns
`src/map/OutlookDayControl.ts`, `src/map/spcOutlook.ts`, `src/map/outlookDay.ts` (+ test), `src/sources/spc/outlook.ts` (+ test, fixtures), `src/panels/OutlookRisk.tsx`, `src/panels/spcRisk.ts` (+ test).

## Forbidden
`src/map/layers.ts` (layer order stays; move layers at runtime with `map.moveLayer` instead), `src/map/mapStyle.ts` (read-only), `LayerControl.ts`, `src/state/*`, `src/lib/*`, `src/ui/*`.

## Verified facts (2026-10-11, browser fetch)
- D1 `TSTM,MRGL,SLGT`, D2 `TSTM`, D3 `TSTM,MRGL,SLGT`, D4–D8 each one empty feature.
  - Empty-day labels: D4/D5 `Predictability Too Low`, D6–D8 `Potential Too Low`.
  - The empty feature: `geometry` is a GeometryCollection with no geometries, `DN: 0`.
- `VALID` / `EXPIRE` / `ISSUE` are `YYYYMMDDHHMM` UTC on every feature, including the empty ones.
- Radar (`radar`) and velocity draw above the outlook (`src/map/layers.ts` order). `OPACITY.spcFill` = 0.16.

## Build
- **Keep the empty-day label.** Add pure `emptyDayLabel(raw)` in `outlook.ts`, returning the LABEL of a DN-0 / empty feature, or null.
  - `normalize` still drops those features from the map data.
  - The layer passes the label and the VALID window to the store, so the caption can say why the map is empty.
- **Caption:** `D2 · MON 12 OCT · HIGHEST TSTM` (highest category over the whole outlook, via `RISK_ORDER`), or `D5 · THU 15 OCT · PREDICTABILITY TOO LOW`.
  - The date comes from `VALID` (UTC day).
  - Category words are tagged with the `abbr` class + `title` from `expand()` (import `expand` from `../ui`: DOM control, ADR-0018).
- **Buttons:** labels `D1`…`D8`, each with `title` = `Day N outlook: <weekday DD MMM>` (computed from today's UTC date before data loads) and `aria-label` starting with `D<n>`.
  - While a day loads, its button shows `aria-busy="true"` and the caption reads `LOADING D3…`.
- **Visible change on the map:**
  - For D2–D8 (future days; current radar is irrelevant to them), move the two outlook layers **above** radar and velocity with `map.moveLayer(id, <first layer above velocity>)`. Find that id from `map.getStyle().layers` at runtime, never hard-coded.
  - Draw them with `fill-opacity` `OPACITY.dim` (0.55, an existing token) and `line-width` 2.
  - Back to D1 → restore the original position (before `radar`) and `OPACITY.spcFill`.
  - Comment the rule.
- **OutlookRisk:** stop refetching the three files on every pan. `useSource` keys on the bbox, so add a module-level fetch memo in `spcOutlookDay(day).fetch` for `refreshMs` (failures not cached), as `src/sources/ibi511/adapter.ts` does.
- **Acronyms (ADR-0018):** OutlookRisk's `SPC` and category word use `<Abbr>`. The day control's head `SPC D1` gets `title` = `expand('SPC')`.

## Acceptance
- [ ] Tests:
  - `emptyDayLabel` on the real D4 fixture;
  - the caption for a loaded day, an empty day and loading;
  - the date from VALID;
  - the button titles;
  - the fetch memo (one network call for two fetches inside `refreshMs`; a failure is not cached).
- [ ] A layer test with a mocked map: switching D1→D2 calls `moveLayer` above velocity and sets opacity 0.55; D2→D1 restores both.
- [ ] Orchestrator live check: press D2, D3, D5, D1. Each press visibly changes the map or caption, and D5 explains why it's empty. 390×844: the control stays collapsible and nothing scrolls.
- [ ] `npm run typecheck && npm run lint && npm test && npm run build:ui` pass.
