# WP-22 — INFLOW map styling: casing, watches layer, focus reticle, hazard palette
Wave 7 · Depends on prep P7a · ADRs: 0008, 0012, **0015** · Spec: HANDOFF.md §2 (hazard, SPC and report palettes; map tokens; contrast rules), §7 (map styling), §8 (fly-to); `Console.dc.html` ~lines 436-475 (overlay drawing rules)

## Goal
Make warnings readable over radar and match the INFLOW map spec.

## Owns
`src/panels/MapPanel.tsx`, `src/map/watchOutlines.ts`, `src/map/spcWatches.ts`, `src/map/spcOutlook.ts` (paint only), `src/map/stormReports.ts` (paint only), `src/map/spcMesoscale.ts` (paint only), plus a new `src/map/mapStyle.ts` for shared paint constants (+ test).

## Forbidden
`src/ui/*`, `src/state/*`, `src/map/layers.ts` order (report if the order must change), `src/map/velocity.ts` (WP-18).

## Build
- `mapStyle.ts`: literal hex constants equal to the token primitives (`--p-nws-*`, `--p-spc-*`, `--p-report-*`, map tokens), plus a unit test that reads `src/ui/tokens.css` and asserts each constant matches its token, so they can't drift.
- **NWS warnings** (MapPanel):
  - 2 px hazard stroke over a 4.5 px `#040608` casing, no fill;
  - FFW (`#8B0000`) gets a light casing `rgba(242,245,247,.6)`;
  - colour by `hazardCode` (TOR `#FF0000`, SVR `#FFA500`, FFW `#8B0000`; other warnings `#8E9AA5`).
- **Watches** as their own layer group: 2 px dashed `10 6`, same casing.
  - `watchOutlines` keeps zone shapes but uses the watch styling and hazard colours (TOA yellow, SVA pink).
  - `spcWatches` boxes use the same TOA/SVA colours.
- **PDS:** 2.5 px red, a 4.5 px white middle stroke and a 7 px casing (hatch optional; skip if it needs a fill pattern).
- **Focus** (existing `useAoi.focus`):
  - fly-to bbox + 15% over 900 ms `cubic-bezier(.45,0,.2,1)` (jump-cut under reduced motion);
  - 9 px ice halo `#CFE6F8` at 35%;
  - hazard fill at 14%;
  - other warnings dimmed to 55% opacity.
  - A reticle (corner brackets) at the focus is optional; if built, use a MapLibre symbol or HTML marker, not a fill.
- **Palettes:** SPC categorical fills at `.16` opacity using the SPC palette; storm reports ▼ tornado `#FF4040`, ■ wind `#3D7DFF`, ● hail `#2DB84A` at 9 px with a 1 px casing.
- **Labels above radar:** if the OpenFreeMap style's label layers can be moved above the radar frames with `moveLayer` (no new basemap), do it in MapPanel after the layers are added; else report.
- **Attribution:** already on the scrim (P4); leave it.

## Acceptance
- [ ] Token-parity test passes.
- [ ] No other colours introduced in paint than the constants.
- [ ] Orchestrator live check over real radar:
  - TOR/SVR/FFW visible, FFW readable;
  - watches dashed;
  - focus dims the others;
  - labels sit above radar.
  - Check at 390×844 too.
- [ ] `npm run typecheck && npm run lint && npm test` pass.
