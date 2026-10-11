# 0014. Responsive tiers: screen sizes and orientations
Status: Accepted
Date: 2026-10-11

## Context
The dashboard is used on a desktop monitor, a laptop, a wall display (WALL preset), and in a vehicle on a tablet or phone (CHASE preset), in both orientations. Until now the layout had one breakpoint (stack below 900 px). Phones in landscape got a 214 px map, sizes saved on a big monitor could crush the map on a small one, `100vh` misbehaves on mobile browsers, touch targets were ~18 px, and the open layer control covered half the map on a phone.

## Decision
Layout tiers live in `src/index.css`; kit-level touch rules live in `src/ui/styles.css`.

| Tier | Media query | Layout |
|---|---|---|
| Desktop | default | Grid with splitters (ADR-0011). Side column capped at `50vw`, console row at `45vh`. |
| Mid-width | `max-width: 1280px` | Same grid; tighter top bar; LOCAL clock hidden. The top bar scrolls horizontally rather than overflowing the page. |
| Narrow | `max-width: 900px` (phones, tablet portrait) | Stacked map → feeds → console; page scrolls; no splitters. |
| Short landscape | `orientation: landscape and max-height: 500px` (phones on their side, vehicle mounts) | Map + feeds side by side fill the first screen; the console is a bounded second screen with 3 columns. Overrides Narrow. |
| Wall | `min-width: 2560px` / `3600px` | Root font 125% / 150%; rem-based UI scales. Tracks stay px (splitter math is 1:1). |
| Touch | `pointer: coarse` | Buttons ≥ 32 px, overlay buttons and caption controls ≥ 28 px, actionable alert rows ≥ 36 px. |

Also:
- `height: 100dvh`;
- safe-area padding (`viewport-fit=cover`);
- the layer control starts collapsed on Narrow and Short-landscape screens.

Every UI change is checked at the **viewport matrix**:

| Size | Represents |
|---|---|
| 1920×1080 | desktop |
| 1366×768 | laptop |
| 1024×768 | tablet landscape |
| 768×1024 | tablet portrait |
| 390×844 | phone portrait |
| 844×390 | phone landscape |
| 3840×2160 | wall |

The pass criteria at each size:
- no horizontal page scroll;
- the map is visible on the first screen;
- every control is reachable without hover.

## Consequences
- Packages must not hard-code widths. They use the kit grids (`stream-grid`, `cam-grid`) and flex-wrap, and they put no meaning in hover alone (ADR-0012 already requires this).
- The orchestrator's live checks include the matrix (browser pane `resize_window`). Builders can't use the browser, so their packages state what to check.
- The `src/ui/styles.css` touch rules change the kit, so re-sync Claude Design.
