# WP-16 — AOI presets (Plains / Dixie Alley / Southeast)
Wave 4 · Depends on orchestrator prep P2 (`aoiRequest`) · ADRs: 0003, 0007, 0012, 0014

## Goal
A top-bar control that jumps the map to a named region. The map's `moveend` then sets the AOI as it does today, so every panel follows.

## Owns
`src/panels/AoiPresets.tsx`, `src/panels/aoiPresetData.ts` (preset data + pure helpers), `src/panels/aoiPresetData.test.ts` (renamed from `aoiPresets.ts`: a case-only clash with the component breaks TypeScript).
Registry edits allowed:
- `Topbar.tsx`: render `<AoiPresets />` next to the AOI readout (one line plus the import);
- `MapPanel.tsx`: one `useEffect` that consumes `aoiRequest` (`fitBounds`, then `clearAoiRequest()`), modelled on the existing `focus` effect.

## Forbidden
Everything else, including `src/state/*` (prep P2 supplies the store API) and `src/ui/*`. Build the control from `ConsoleButton` (pressed = the preset matching the current AOI).

## Prep contract (P2, done by the orchestrator before the wave)
`useAoi` gains `aoiRequest: { bbox: Bbox; seq: number } | null`, `requestAoi(bbox)` and `clearAoiRequest()`.

## Build
- Presets (`aoiPresets.ts`). Tune them by eye and keep them in data:
  - `PLAINS` (TX panhandle → NE: about W −104, S 31, E −94, N 43);
  - `DIXIE` (LA/MS/AL/TN: about W −94, S 29.5, E −84.5, N 37);
  - `SOUTHEAST` (= `DEFAULT_AOI`, GA/SC).
- Pure `matchPreset(bbox)` → preset id when the current AOI is within a tolerance of one, else null, so a manual pan un-presses the button (honest feedback).
- UI: a compact group of `ConsoleButton`s with UPPERCASE labels and `aria-pressed`, keyboard reachable, with a `title` describing the region. It follows ADR-0012: signifier, hover, `:focus-visible`, pressed feedback.

## Responsive (ADR-0014)
- The control lives in the top bar:
  - It wraps on the Narrow tier (≤ 900 px) and scrolls horizontally on Mid-width and Short-landscape screens.
  - Use short labels (`PLAINS`, `DIXIE`, `SE`), a `title` with the full name, and `flex: none`. `ConsoleButton` already enlarges on touch (`pointer: coarse`).
- Presets are bboxes. `fitBounds` adapts them to any aspect ratio, so portrait shows the region narrower and taller. Use `padding` ≤ 20 px so phones keep the region filled.
- Orchestrator checks at 1366×768, 1024×768, 390×844 and 844×390: no horizontal page scroll, every preset reachable, the pressed state visible.

## Acceptance
- [ ] Tests: `matchPreset` hits and misses; presets lie within the US.
- [ ] Orchestrator live check: clicking DIXIE moves the map; the AOI readout shows LA · MS · AL · TN-ish states; cameras/streams/alerts follow; a manual pan un-presses the button.
- [ ] `npm run typecheck && npm run lint && npm test` pass.
