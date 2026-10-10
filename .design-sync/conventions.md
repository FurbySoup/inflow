# Storm Chasers UI: conventions for building with this kit

A dark, dense **mission-control console** for live severe-weather data. Components are presentational: you pass the data, they render it. There's no provider or context to set up.

## Setup
- Load `styles.css`. It defines every token and component class, and its import closure includes `_ds_bundle.css`.
- **Dark surfaces only.** `body` gets the `--bg` canvas from the stylesheet. Put components on `var(--bg)`, `var(--panel)` or `var(--panel-head)`; light surfaces make the muted text unreadable.
- Components come from `window.StormChasersUI`: `Panel`, `StatusLed`, `Badge`, `ConsoleButton`, `AlertList`, `AlertRow`, `StreamTile`, `CameraTile`, plus the `formatRemaining(ms)` helper (returns `T-mm:ss`).

## Styling idiom: CSS custom properties + a small class vocabulary
- **Never hardcode colours.** Use `var(--…)` tokens:
  - surfaces: `--bg`, `--panel`, `--panel-head`, `--border`;
  - text: `--text`, `--muted`;
  - interaction: `--accent` (the only brand/interaction hue);
  - feed health: `--live`, `--stale`, `--error`, `--offline`;
  - hazard severity: `--extreme`, `--severe`, `--moderate`;
  - type: `--font-ui` for headings, `--font-data` (monospace) for every number, code, clock, count and data value.
- **Classes you may use in your own layout glue:**

  | Purpose | Classes |
  |---|---|
  | Text | `muted`, `error`, `accent`, `panel-code` (accent mono designator) |
  | Layouts | `stream-grid` (2-col StreamTile grid), `cam-grid` (auto-fill CameraTile grid) |
  | Panel internals | `panel`, `panel-head`, `panel-body` (already rendered by `Panel`, don't rebuild) |
- Labels are UPPERCASE with letter-spacing. Empty states read like console messages, e.g. `NO SCANNER SYSTEMS IN AOI`.

## Interaction rules (ADR-0012, Norman)
- Every interactive element needs a **persistent signifier**, plus hover, `:focus-visible` and visible feedback. Read-only items (badges, LEDs, counts) must never look clickable.
- `AlertRow` with `onSelect` shows a ⌖ "focus on map" glyph; `zone` rows don't.
- `ConsoleButton pressed` is a solid accent fill.
- Never use colour alone for severity or status. Pair it with a badge, glyph or text (`PDS`, `ZONE`, `T-mm:ss`).

## Where the truth lives
- `styles.css` / `_ds_bundle.css`: every token and class.
- `guidelines/`: ADR-0007 (mission-control UI) and ADR-0012 (signifiers).
- Each component's `.prompt.md` and `.d.ts`: props and examples.

## Example
```jsx
const { Panel, AlertList, AlertRow, ConsoleButton } = window.StormChasersUI

<div style={{ display: 'flex', flexDirection: 'column', height: 260, background: 'var(--bg)', padding: 4 }}>
  <Panel code="WX-02" title="NWS Alerts" status="live" meta={2} collapsible onToggleCollapse={() => {}}>
    <AlertList>
      <AlertRow event="Tornado Warning" area="Jefferson, GA" severity="Extreme" remainingMs={542000} emergency onSelect={() => {}} />
      <AlertRow event="Tornado Watch" area="Burke, GA; Bamberg, SC" severity="Extreme" remainingMs={16200000} zone />
    </AlertList>
    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
      <ConsoleButton pressed>ALL</ConsoleButton>
      <ConsoleButton>WARNINGS</ConsoleButton>
    </div>
  </Panel>
</div>
```
`Panel` fills its flex parent, so give the parent a height. Codes: `WX-` weather, `VID-` video, `AUD-` audio, `CCTV-` cameras, `SAT-` satellite, `SPC-` outlooks.
