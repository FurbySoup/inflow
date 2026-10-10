# WP-10 — Layout customization (console split, collapse, presets)
Wave 3 · ADRs: 0007, 0011 · Orchestrator-reviewed: touches the shared layout store.

## Goal
Build on the v1 splitters: resizable console panels, collapsible panels, and named layout presets.

## Owns
`src/state/layout.ts` (extend; keep existing API), `src/panels/Splitter.tsx`, `src/panels/LayoutMenu.tsx` (new), `src/state/layout.test.ts` (new).
Registry edits allowed: `App.tsx` (wire console splitters, pass collapse state), `src/panels/Topbar.tsx` (mount `<LayoutMenu />`), `src/panels/Panel.tsx` (add optional collapse button — **only** an optional `collapsible` prop; no other changes), layout section of `src/index.css` (grid + `.splitter*` rules only).

## Build
- `consoleSplit: [number, number, number]` (fractions summing to 1, each ≥ 0.15) with two vertical splitters inside `.bottom`; grid uses `fr` values from the store.
- `hidden: string[]` keyed by panel `code`; `<Panel collapsible>` shows a `▾/▸` button in the header; collapsed panels render header only and the grid gives the space to siblings (console: fraction → 0; side column: header-height row).
- Presets: `DEFAULT` (current defaults), `WALL` (side 560, bottom 300), `CHASE` (side 300, bottom 160, AUD-01 + CCTV-01 collapsed). `LayoutMenu` in the top bar: preset buttons + `RESET`. Saving custom presets is out of scope.
- Bump storage key to `storm-chasers.layout.v2`; migrate v1 `{sideWidth, bottomHeight}` forward.
- Keep everything keyboard accessible (splitters already are; menu buttons are `<button>`).

## Acceptance
- [ ] Console panels resize independently; minimum widths enforced.
- [ ] Collapsing any panel frees its space; state survives reload.
- [ ] Presets switch instantly; v1 saved sizes migrate.
- [ ] Unit tests: clamping, fraction normalisation, v1→v2 migration, corrupt storage fallback.
- [ ] Checks pass; manual check at 1280×800 and 1920×1080.
