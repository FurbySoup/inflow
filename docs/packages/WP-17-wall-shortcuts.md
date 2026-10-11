# WP-17 — Wall-display keyboard shortcuts
Wave 5 · Depends on Wave 4 merged + orchestrator prep P3 · ADRs: 0007, 0011, 0012, 0014

## Goal
Run the dashboard on a wall display from the keyboard: cycle the primary stream, toggle map layers, apply AOI presets and layout presets, go fullscreen, and see the key map on demand.

## Owns
`src/panels/KeyboardShortcuts.tsx` (global key handler + `?` help overlay; not `Shortcuts.tsx`, which clashes by case with `shortcuts.ts`), `src/panels/shortcuts.ts` (pure keymap → action), `src/panels/shortcuts.test.ts`.
Registry edit allowed: mount `<KeyboardShortcuts />` once in `App.tsx`.
Orchestrator-approved during review: `Topbar.tsx` renders `<KeysButton />` (the "? KEYS" hint), replacing a fixed bottom-right button that covered the cameras panel.

## Forbidden
Everything else. All actions go through store/registry APIs that prep P3 provides; don't reach into panels.

## Prep contract (P3, done 2026-10-11, commit 1e02ca7)
- `src/state/streams.ts`: `useStreams.getState().cyclePrimary(1 | -1)` steps the main feed through the display order, wrapping and persisting. Do nothing extra in StreamsGrid.
- `src/map/LayerControl.ts`: `toggleLayer(id): boolean` and `layerIds(): string[]`. They act exactly like clicking the row (persistence + LED/aria feedback) and return false/[] before the map has loaded.
- Overlay ids: `radar`, `satellite`, `spc-outlook`, `watch-outlines`, `spc-md`, `spc-watch`, `storm-reports`, `alerts`. **W** toggles both `watch-outlines` and `spc-watch`.
- AOI presets: `AOI_PRESETS` (order plains, dixie, southeast) in `src/panels/aoiPresetData.ts`, applied with `useAoi.getState().requestAoi(preset.bbox)`.
- Layout presets: `useLayout.getState().applyPreset('DEFAULT' | 'WALL' | 'CHASE')`.

## Build (keymap confirmed by the user 2026-10-11)
- `[` / `]` previous / next primary stream; `1`–`3` AOI presets (WP-16); `Shift+1`–`3` layout presets DEFAULT/WALL/CHASE; `R` radar, `S` satellite, `W` watches (layer toggles); `F` fullscreen (`requestFullscreen`); `?` toggle the help overlay; `Esc` closes it.
- Ignore keys while focus is in an input/select/textarea/contenteditable or a YouTube iframe has focus (a known limit: iframes swallow keys, so document it in the overlay).
- The help overlay is a read-only kit `Panel` listing the keys, using `--font-data` for key caps.

## Responsive (ADR-0014)
- Keyboard shortcuts are a desktop/wall feature. On touch-only devices nothing must break and nothing should advertise keys.
- The help overlay fits 390 px wide (scrolls inside itself) and is legible at 3840×2160 (rem-based; the wall tier scales the root font).

## Acceptance
- [ ] Tests: keymap resolution, input-focus guard.
- [ ] Orchestrator live check of each key.
- [ ] `npm run typecheck && npm run lint && npm test` pass.
