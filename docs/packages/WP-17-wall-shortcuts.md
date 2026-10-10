# WP-17 — Wall-display keyboard shortcuts
Wave 5 · Depends on WP-11 (AOI presets) and WP-13 (stream lifecycle) merged · ADRs: 0011, 0012

## Goal
Keyboard control for an unattended wall display: cycle the primary stream, toggle map layers, apply AOI and layout presets, fullscreen, and a `?` overlay listing the shortcuts.

## Owns
`src/panels/Shortcuts.tsx` (global keydown listener + `?` overlay), `src/panels/shortcuts.ts` (pure key→command map + tests).
Registry edits allowed:
- `App.tsx`: mount `<Shortcuts />`;
- `StreamsGrid.tsx`: subscribe to a `cycle-primary` command;
- `LayerControl.ts`: expose `toggle(id)`.

## Forbidden
Shared files. If commands need cross-panel state, stop and report: the orchestrator decides whether a command bus goes into `src/state/`.

## Verified facts
No network facts. Prep **P5** (before Wave 5) decides how commands reach panels: a tiny `useCommands` store in `src/state/` versus DOM `CustomEvent`s. Write that into this package before launch.

## Build (sketch, finalize after Wave 4)
- Keys:
  - `]`/`[` next/previous primary stream;
  - `1–3` AOI presets;
  - `Shift+1–3` layout presets;
  - `R`/`S`/`W` toggle radar/satellite/watch outlines;
  - `F` fullscreen;
  - `?` help.
- Ignore keys while focus is in an input, select or iframe.
- The `?` overlay is the signifier for an otherwise invisible affordance (ADR-0012). A one-time `? KEYS` hint sits in the top bar.

## Acceptance
- [ ] Unit tests for the key map and the input-focus guard.
- [ ] Live (orchestrator): each key works; `?` lists them; typing in the audio search doesn't trigger shortcuts.
- [ ] Checks pass.
