# 0007. Mission-control UI and design tokens
Status: Accepted
Date: 2026-10-10

## Context
The app is a live situational-awareness wall. It should read like a mission-control console: dense, dark, glanceable, with obvious feed health. Many panels are built by different sub-agents and must look like one system.

## Decision
- **Layout:** fixed CSS grid in `src/index.css` — top bar, map (center), feeds column (right), three-panel console row (bottom). Collapses to a single column under 900 px.
- **Panel chrome:** every panel renders inside `<Panel code title status meta>` (`src/panels/Panel.tsx`):
  - `code`: console designator — `WX-` weather, `VID-` video, `AUD-` audio, `CCTV-` cameras, `SAT-` satellite, `SPC-` outlooks/reports.
  - `status`: `live | loading | stale | error | offline` LED; derive from query state via `queryStatus()` (`src/lib/feedStatus.ts`).
- **Tokens:** all colors/fonts are CSS custom properties on `:root` in `src/index.css`. Components never hardcode colors (map paint expressions are the only exception and should mirror token values).
- **Type:** UI sans for headings, `--font-data` monospace for all data values, codes, clocks, counts. Uppercase tracked labels.
- **Severity colors:** `--extreme` red (tornado), `--severe` orange, `--moderate` yellow.
- **Top bar:** brand, AOI states, UTC (Z) and local clocks.
- Animation limited to LED pulses; disabled under `prefers-reduced-motion`.

## Consequences
- New panels get a consistent look for free; reviewers reject panels that bypass `<Panel>` or add raw colors.
- Light mode is intentionally unsupported in v1.
