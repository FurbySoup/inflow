# WP-17 — Wall-display keyboard shortcuts
Wave 5 · Depends on Wave 4 merged + orchestrator prep P3 · ADRs: 0007, 0011, 0012, 0014

## Goal
Run the dashboard on a wall display from the keyboard: cycle the primary stream, toggle map layers, apply AOI presets and layout presets, go fullscreen, and see the key map on demand.

## Owns
`src/panels/Shortcuts.tsx` (global key handler + `?` help overlay), `src/panels/shortcuts.ts` (pure keymap → action), `src/panels/shortcuts.test.ts`.
Registry edit allowed: mount `<Shortcuts />` once in `App.tsx`.

## Forbidden
Everything else. All actions go through store/registry APIs that prep P3 provides; don't reach into panels.

## Prep contract (P3, done by the orchestrator after Wave 4 merges)
- Primary-stream state moves from `StreamsGrid` local state into a small store (`src/state/streams.ts`: `primaryId`, `cyclePrimary(dir)`), with persistence unchanged.
- `LayerControl` exposes a `toggleLayer(id)`/`layerIds()` API usable without the DOM control.

## Build (proposed keymap; the orchestrator confirms with the user before the wave)
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
