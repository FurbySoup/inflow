# 0011. Layout customization
Status: Accepted
Date: 2026-10-10

## Context
Users want to size the dashboard to their screen and task (a wall display during an outbreak vs. a laptop while chasing). v1 needs basic resizing now; richer customization (hide/reorder panels, presets, pop-outs) comes later and must not require reworking panels.

## Decision
- **One layout store**, `useLayout` (`src/state/layout.ts`), persisted to `localStorage` under a versioned key (`storm-chasers.layout.v1`). All layout preferences live here; panels never persist their own size or placement. Per-panel *content* preferences (e.g. primary stream, layer toggles) may stay with the panel.
- **v1 (built):** two splitters — feeds column width and console row height — drive CSS custom properties (`--side-w`, `--bottom-h`) consumed by the grid in `src/index.css`. Values are clamped to `LAYOUT_LIMITS`; double-click or `Home` resets; arrow keys step 16 px. Splitters hide below 900 px (stacked mobile layout). Iframes ignore pointer events during a drag so YouTube embeds don't swallow it. The map calls `resize()` from a `ResizeObserver`.
- **Next (WP-10, Wave 3):** extend the same store with:
  - `consoleSplit: number[]` — resizable widths for the three console panels.
  - `hidden: string[]` — panel ids (by `<Panel code>`) the user collapsed; a collapsed panel shrinks to its header bar.
  - `presets` — named snapshots of the whole layout state (e.g. `WALL`, `CHASE`, `DEFAULT`), switchable from the top bar.
  - Store migration: bump the storage key version and map old values forward; never throw on a bad saved value.
- **Later (roadmap):** drag-to-reorder/swap panels between grid slots, pop-out a panel into its own window (`window.open` + `BroadcastChannel` for AOI sync), fullscreen a single panel, and syncing layouts to an account (v3).

## Consequences
- Panels stay layout-agnostic: they fill whatever box the grid gives them, so every panel must handle being narrow or short (scroll inside `.panel-body`, no fixed heights).
- The grid template in `index.css` becomes the single layout contract; changing slot names is a breaking change for saved presets.
