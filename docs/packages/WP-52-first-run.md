# WP-52 — First-run understanding (START HERE, layout hints, PLAINS pressed)
Wave 13 · ADRs: 0011, 0012, 0014, 0018 · Source: `docs/polish-plan.md`

## Goal
A first-time visitor should understand the screen in a minute:
- what the area means;
- what the panel lights mean;
- why chasers appear and disappear;
- what DEFAULT/WALL/CHASE do.

Today `? HELP` is a glossary, not an explanation. The default PLAINS view doesn't even show as selected.

## Owns
- `src/panels/help/HelpDialog.tsx` (+ test), `src/panels/help/help.css`, new `src/panels/help/StartHereTab.tsx` (+ test)
- `src/panels/LayoutMenu.tsx`, `src/panels/TopbarMore.tsx` (+ their tests)
- `src/panels/aoiPresetData.ts` (+ test)

## Forbidden
- `src/panels/help/startHere.ts` and `about.ts`: **never edit**. The orchestrator wrote them, and the wording must stay exact.
- Also off limits: `src/ui/*` (incl. `glossary.ts`), `src/index.css`, `src/state/*`, `src/lib/*`, `src/panels/MapPanel.tsx`, `src/panels/Topbar.tsx`.
- If one must change, stop and report.

## Verified facts (on `main`, 2026-10-17)
- **`startHere.ts`** exports `START_HERE: { title, body }[]` (6 steps).
- **`HelpDialog.tsx`:**
  - tabs are `TABS` (`shortcuts`, `screen`, `chasers`, `about`);
  - the stored tab lives under `storm-chasers.help.tab`, validated against `TABS` ids;
  - `initialTab()` returns the stored tab, else `screen` on a coarse pointer, else `shortcuts`;
  - ABOUT is not searchable: no search toolbar while it's selected, and `countFor('about')` is 0;
  - `GLOSSARY_GROUPS` uses "Area & time", "Agencies & products", "Streams & cameras", "Radar & satellite", "Licences & tech".
- **`LayoutMenu.tsx`:**
  - renders DEFAULT/WALL/CHASE `ConsoleButton`s with `aria-label="Apply X layout"` and no `title`;
  - RESET is `variant="quiet"`, which looks like plain text (an ADR-0012 signifier miss).
  - `PRESETS` in `src/state/layout.ts`:
    - WALL hides `AUD-01` and `CCTV-01`;
    - CHASE hides `CCTV-01` and shows a single stream.
- **`TopbarMore.tsx`:** at ≤ 900 px it wraps NotifyControl, KeysButton (? HELP) and LayoutMenu in a popover. The layout buttons there have no heading.
- **PLAINS isn't pressed on load.** `DEFAULT_AOI` equals the PLAINS bbox `{ west: -104, south: 31, east: -94, north: 43 }`. MapPanel starts with `bounds: DEFAULT_AOI` and some padding. The resulting view's south edge was 31.054 at 1440×900, and `isPresetView` requires `view.south <= preset.south + EDGE_SLACK` with `EDGE_SLACK = 0.05`, so it fails by 0.004°.

## Build
- **START HERE tab**, the **first** tab (id `start`, label `START HERE`):
  - renders `START_HERE` as a numbered list: the title in the group-title style, the body through `TaggedText`, so PLAINS, SE, SPC, D1, NOTIFY and other glossary terms get tips;
  - not searchable, like ABOUT (no toolbar, `countFor('start')` is 0, and the SHORTCUTS no-match jump never selects it);
  - a stored tab still wins; **with nothing stored, open on START HERE** for everyone (replacing the coarse/fine default);
  - arrow, Home and End keys include it.
- **Group names:** "&" becomes "and" in `GLOSSARY_GROUPS` labels.
- **Layout buttons:** add `title` tooltips, keeping the visible text as the accessible name (do not change `aria-label`):
  - DEFAULT: "Everything on one screen";
  - WALL: "Map, warnings and video, sized for a TV or second monitor";
  - CHASE: "One stream, radio and warnings, for a laptop in the car";
  - RESET: "Reset sizes to DEFAULT".
- **RESET** becomes a normal (outlined) `ConsoleButton`, so it has a persistent signifier.
- **MORE popover:** add a small `LAYOUT` label (muted, `--font-data`, not interactive) before the layout buttons inside the popover only. Above 900 px the bar must look exactly as today. Use `display: contents` patterns like the existing `topbar-more.css`, or render the label inside `TopbarMore` with a class hidden above 900 px. `topbar-more.css` is yours to edit.
- **PLAINS pressed on load:** make the default view match its preset.
  - Raise `EDGE_SLACK` to `0.1`. That is still far tighter than any real pan.
  - Add a test with the measured view `{ west: -105.2, south: 31.054, east: -92.8, north: 42.946 }`, expecting `'plains'`.
  - Keep the existing tests that require a real pan to un-press.

## Acceptance
- [ ] `HelpDialog.test.tsx`:
  - with nothing stored, it opens on START HERE (both pointer types);
  - START HERE has 6 numbered steps with a glossary `abbr` inside;
  - there's no search box on START HERE;
  - the no-match jump never selects START HERE;
  - keyboard order is START HERE, SHORTCUTS, ON SCREEN, CHASER TERMS, ABOUT;
  - group names contain no "&".
  - Existing tests are updated only where the first-tab default changed.
- [ ] `LayoutMenu` test: each preset button has its `title` and keeps its visible-text accessible name; RESET isn't the quiet variant.
- [ ] `TopbarMore` test: the LAYOUT label renders once and isn't focusable.
- [ ] `aoiPresetData.test.ts`: the measured default view matches PLAINS; a 0.2° pan does not.
- [ ] `set -o pipefail; npm run typecheck && npm run lint && npm test && npm run build:ui` pass.
