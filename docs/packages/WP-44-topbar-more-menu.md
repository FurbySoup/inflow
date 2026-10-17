# WP-44 — Top bar "≡ MORE" menu at ≤ 900 px
Wave 10 · ADRs: 0012, 0014, 0018, 0019

## Goal
At tablet portrait (768×1024) the top bar wraps to 3 rows / ~100 px. The user chose (2026-10-17) to fold the **settings-type** controls into one "≡ MORE" popover at ≤ 900 px, while the at-a-glance status stays in the bar. Target: 2 rows or fewer at 768×1024 and 390×844.
- **Into MORE at ≤ 900 px:** `NotifyControl`, `KeysButton` (? HELP), `LayoutMenu` (DEFAULT/WALL/CHASE/RESET).
- **Stays in the bar:** brand, AOI + clock, ThreatButton, WarningsHiddenChip, OutlookRisk, AoiPresets, UTC.
- **Above 900 px:** nothing changes. No MORE button, and the controls render exactly as today.

## Owns
- `src/panels/TopbarMore.tsx` (new) + `TopbarMore.test.tsx`.
- `src/panels/topbar-more.css` (new). It is imported by `TopbarMore.tsx`, as `ThreatButton` imports `threat.css`.
- `src/panels/Topbar.tsx`: one edit only. Wrap the three controls in `<TopbarMore>…</TopbarMore>`.

## Forbidden
`src/index.css`, `src/ui/*` (use the kit's `ConsoleButton` as is), `src/state/*`, `src/lib/*`, `src/notify/**`, `KeyboardShortcuts.tsx`, `LayoutMenu.tsx`. If one of them must change, stop and report.

## Verified facts (code on `main`, 2026-10-17)
- **Breakpoint:** the narrow tier is `@media (max-width: 900px)` in `src/index.css`. The short-landscape tier (`orientation: landscape and max-height: 500px and max-width: 900px`) also falls under ≤ 900 px, so MORE applies there too.
- **Top bar layout:** `.topbar` is flex with wrap. Children are `flex: none`, and a `.spacer` (flex 1) sits before NotifyControl.
- **Presets at narrow widths:** at ≤ 900 px `App.tsx` sets `data-preset='mobile'`, so the layout presets have the least value there.
- **NotifyControl:** it has its own popover (`.notify-pop`) with click-outside and Escape handling, and it must keep working when nested.
- **KeysButton:** toggles the help dialog through `setHelpOpen`. The `?` key shortcut works independently of the button.
- **Accessible names:** the visible text is the accessible name for these buttons (WCAG 2.5.3). Keep the visible text "≡ MORE"; a `title` may describe it.

## Build
- **Single instance, CSS-switched.** Never render a control twice, since NotifyControl and KeysButton hold state and ids.
  - `TopbarMore` renders a `ConsoleButton` "≡ MORE" (`aria-expanded`, `aria-controls`) plus a `<div className="topbar-more" id=… data-open=…>` around its children.
  - In `topbar-more.css`:
    - **> 900 px:** the button is hidden (`display: none`) and the group is `display: contents`, so the children sit in the bar exactly as now.
    - **≤ 900 px:** the button shows. The group is `display: none` unless `data-open="true"`. Open, it is an absolutely positioned popover under the button: column layout, `gap`, `background: var(--panel-head)`, `border: 1px solid var(--border)`, `z-index` above the map, `max-width: calc(100vw - 24px)`, and no horizontal page scroll. Tokens only, no hardcoded colours.
- **Behaviour:**
  - Escape closes MORE and returns focus to its button, unless the nested notify popover is open; that one consumes Escape first.
  - Click outside closes it. A click inside, including inside the nested notify popover, does not.
  - Opening moves focus to the first control inside.
  - Choosing HELP closes MORE, so the help dialog isn't covered.
- **Signifier and feedback (ADR-0012):** the button shows pressed (solid accent) while open, the kit's `pressed` style. `:focus-visible` comes from the kit.
- **Touch:** the kit's `pointer: coarse` sizes apply. Nothing may depend on hover.
- Add a header comment covering affordance, signifier and feedback, like the other panel components.

## Acceptance
- [ ] Tests (jsdom can't evaluate media queries, so test behaviour and markup):
  - the button toggles `data-open` and `aria-expanded`;
  - Escape closes and restores focus;
  - an outside mousedown closes; an inside one doesn't;
  - the children are rendered once.
- [ ] The existing Topbar/NotifyControl/KeyboardShortcuts tests still pass unchanged.
- [ ] Orchestrator live check (not the builder):
  - 768×1024 and 390×844: the bar is ≤ 2 rows, and MORE opens with NOTIFY, HELP and the presets all usable;
  - 844×390: no horizontal scroll;
  - 1024×768 and above: identical to before, with no MORE button.
- [ ] `set -o pipefail; npm run typecheck && npm run lint && npm test && npm run build:ui` pass.
