# WP-25 — `data-preset` layouts (DEFAULT / WALL / CHASE / mobile) + splitter grips
Wave 7 · Depends on prep P7b · ADRs: 0011, 0012, 0014, **0015** · Spec: HANDOFF.md §4 (gutter, splitter, radius), §5 (layout presets); `tokens.css` `[data-preset]` blocks; `Console.dc.html` line 11 + 480-500 (preset rules: which panels collapse)

## Goal
The layout presets become real layouts, not just resized tracks:
- **WALL:** a full-height alerts column left of the map, large type.
- **CHASE:** map left, everything stacked right, large touch targets.
- **mobile** (≤900 px).

Today they only change sizes.

## Owns (this wave only; shared files, single owner per ADR-0015)
`src/App.tsx`, `src/index.css` (layout sections only), `src/state/layout.ts` (+ test), `src/panels/Splitter.tsx`, `src/panels/LayoutMenu.tsx`.

## Forbidden
`src/ui/*`, `src/ui/tokens.css` (consume `--layout-cols/rows/areas` and the per-preset size tokens; don't redefine them), panel internals.

## Build
- **`data-preset`:**
  - on the `.layout` root, from the layout store's current preset (store the chosen preset name, persisted, migrating the storage key if needed);
  - mobile is automatic below 900 px (media query in index.css), not a stored preset.
- **Grid:**
  - use `grid-template-columns/rows/areas` from the preset tokens, plus splitter tracks where the preset has them;
  - DEFAULT keeps user-resizable feeds width / console height / console split (ADR-0011);
  - WALL and CHASE use the token geometry, splitters hidden or limited to the feeds column; say which in the code comment;
  - panels per preset collapse as the spec says (WALL: radio + cams collapsed; CHASE: cams collapsed and a single stream).
  - Gutters `--gutter` with **no panel borders** (HANDOFF §4); remove `.panel` borders only via layout CSS here if they live in index.css. Otherwise report it for WP-20, which owns `panel.css`.
- **Splitter:**
  - 12 px hit area (44 px in CHASE / coarse pointer) centred on the gutter;
  - 1 px `--border-strong` line;
  - a grip chip of three 2 px dots on `--surface-raised`;
  - `role="separator"`, ←/→ 16 px, double-click resets (keep all existing behaviour and the drag cleanup).
- **LayoutMenu:** keep the DEFAULT/WALL/CHASE buttons (pressed = current). The keyboard shortcuts (Shift+1..3) already call `applyPreset`, so keep that API.
- Keep the ADR-0014 tiers working: short-landscape, the wall font scale (fold into `[data-preset="wall"]` if it duplicates), safe areas, `dvh`.

## Acceptance
- [ ] Tests: preset persistence/migration, which panels collapse per preset, store API unchanged for the shortcuts.
- [ ] Orchestrator live check at the full ADR-0014 viewport matrix for each preset: no horizontal scroll, map visible on the first screen, every control reachable; splitters work in DEFAULT.
- [ ] `npm run typecheck && npm run lint && npm test` pass.
