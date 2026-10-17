# WP-47 — ABOUT tab in `? HELP` (disclaimer, data terms, attributions)
Wave 11 · ADRs: 0012, 0014, 0018, 0020

## Goal
The app itself carries the life-safety disclaimer, the honest data terms and the credits for every source, as a fourth **ABOUT** tab in the existing `? HELP` dialog. It also shows the version, so bug reports can name it. All the words come from `src/panels/help/about.ts`. This package renders them and never changes the wording.

## Owns
- `src/panels/help/AboutTab.tsx` (new) + `AboutTab.test.tsx` (new)
- `src/panels/help/HelpDialog.tsx`, `HelpDialog.test.tsx`
- `src/panels/help/help.css`

## Forbidden
- `src/panels/help/about.ts`: **never edit**. The orchestrator wrote it, and its wording must stay exact.
- Also forbidden: `src/ui/*` (including `glossary.ts`; the entries you need already exist), `src/index.css`, `src/state/*`, `src/lib/*`, `KeyboardShortcuts.tsx`, `vite.config.ts`.
- If one must change, stop and report.

## Verified facts (on `main`, 2026-10-17)
- **`about.ts` exports:**
  - `DISCLAIMER` (string);
  - `DATA_TERMS` (string[]);
  - `CREDITS` (`{ what, who, url, note? }[]`);
  - `CAMERA_CREDITS` (`{ site, agency, states }[]`);
  - `PROJECT` (`{ name, descriptor, repo, licence }`).
- `__APP_VERSION__` is a global string constant, injected by Vite `define` and declared in `src/vite-env.d.ts`. Vitest uses the same config, so it's defined in tests too (currently `"0.0.0"`).
- **`HelpDialog.tsx`:**
  - `TabId` = `'shortcuts' | 'screen' | 'chasers'`, with a `TABS` array;
  - the selected tab is stored in localStorage key `storm-chasers.help.tab` (`readStoredTab` validates it against the known ids);
  - `countFor(tab, query)` drives the match count;
  - `changeQuery` jumps away from SHORTCUTS when it has no matches;
  - arrow/Home/End keys move between tabs.
- `GLOSSARY_GROUPS` in `HelpDialog.tsx` maps glossary keys to display groups; unlisted keys fall into "Other". The orchestrator just added glossary entries `NOAA`, `IEM`, `HF`, `API`, `ODbL` and `MIT`.
- **Kit:** `TaggedText` (from `../../ui`) wraps whitespace-separated glossary acronyms in a string with `Abbr` tips. `about.ts` strings are written so their acronyms stand alone (e.g. "SPC watch and MD shapes").
- The existing `HelpDialog.test.tsx` tests must keep passing. You may update the dialog `aria-label` and any test that asserts it.

## Build
- **Tabs:** add `{ id: 'about', label: 'ABOUT' }` as the **last** tab. Arrow keys, Home/End and the stored-tab logic must include it. A stored `'about'` reopens on ABOUT.
- **Search:**
  - ABOUT is not searchable. While ABOUT is selected, don't render the search toolbar.
  - `countFor('about', …)` is 0.
  - The "jump from SHORTCUTS" logic never jumps to ABOUT.
  - Switching to ABOUT keeps the query, so it's still there when the user switches back.
- **Glossary groups:** put `NOAA` and `IEM` in "Agencies & products", `HF` in "Radio", and add a group `"Licences & tech"` with `API`, `ODbL` and `MIT`. Leave existing "Other" terms (KIWISDR, OPENMHZ, MHZ, …) where they are; regrouping them is out of scope.
- **`AboutTab` layout** (top to bottom):
  1. **Disclaimer:** a block with `role="note"`, using the warning tokens (the same tokens the kit uses for TOR/warning emphasis; check `src/ui/styles.css`, and use no hardcoded colours). Text: `DISCLAIMER`.
  2. **Identity line:** `INFLOW: storm situation room` (from `PROJECT`), then `v{__APP_VERSION__}` in `--font-data`, then `MIT licence` and a link to `PROJECT.repo` labelled `SOURCE ON GITHUB ↗`.
  3. **"How the data is used"** heading + `DATA_TERMS` as a list.
  4. **"Data and credits"** heading + `CREDITS` as a definition list or table: `what` (through `TaggedText`), `who` as a link to `url` with ↗, and `note` in muted text.
  5. **"Traffic cameras"** heading, with one line before the list: "Images belong to each state's DOT." Then `CAMERA_CREDITS` as a compact multi-column list: `site`, `agency`, with `states` in `--font-data`.
- **Links:**
  - `target="_blank" rel="noopener noreferrer"`;
  - persistent signifier: underline + ↗ glyph (ADR-0012), with a `:hover` change and `:focus-visible` from the kit/existing help styles;
  - the ↗ glyph is `aria-hidden`, and the accessible name says "(opens in a new tab)" via visually hidden text or `aria-label`.
- **Responsive (ADR-0014):** no fixed widths. The camera list goes to one column at ≤ 900 px. Text wraps; no horizontal scroll at 390 px.
- Render acronym-bearing strings through `TaggedText`. Don't hand-wrap words that aren't in the glossary.
- **Header comment** on `AboutTab`: affordance (links open sources), signifier (underline + ↗), feedback (hover/focus). The disclaimer block is read-only and must not look clickable.

## Acceptance
- [ ] `AboutTab.test.tsx` covers:
  - the disclaimer text is present with `role="note"`;
  - the version renders from `__APP_VERSION__`;
  - every `CREDITS` entry renders a link with its `url`, `target="_blank"` and `rel` containing `noopener`;
  - every `CAMERA_CREDITS` site appears;
  - a glossary acronym in a credit (e.g. `SPC`) renders as an `abbr` with a title.
- [ ] `HelpDialog.test.tsx` covers:
  - ABOUT is reachable by click and with End from the first tab;
  - the search box is absent on ABOUT and returns with the query intact on switching back;
  - a stored `about` tab reopens on ABOUT;
  - typing a no-match query on SHORTCUTS never selects ABOUT;
  - `NOAA`, `IEM`, `HF`, `API`, `ODbL` and `MIT` each appear on ON SCREEN outside the "Other" group.
- [ ] `set -o pipefail; npm run typecheck && npm run lint && npm test && npm run build:ui` pass.
- [ ] Orchestrator live check (not the builder): ABOUT at 1920×1080, 768×1024 and 390×844, with no horizontal scroll and links opening in new tabs.
