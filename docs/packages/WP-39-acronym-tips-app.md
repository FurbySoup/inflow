# WP-39 — Acronym tips across the rest of the app
Wave 9 · Depends on prep P9a (kit `Abbr`, `GLOSSARY`, `expand`) · ADRs: **0018**, 0012, 0014

## Goal
User request (2026-10-11): "each static use of an acronym/abbreviation needs a mouse-over tip".
- The kit components and the top bar's AOI / UTC / LOCAL are done (prep P9a).
- WP-35, WP-36, WP-37 and WP-38 tag the files they own.
- This package covers every other app file that renders static acronyms.

## Owns (acronym tags only; no behaviour changes)
- `src/panels/ThreatButton.tsx`: `TOR`, `PDS`, `NEXT EXP` (EXP = expires).
- `src/panels/AudioPanel.tsx`: `SCANNER · OPENMHZ`, `CB 19 / 2M`, `KIWISDR`, `RX NEAR`, `TG`, `KM`, `CB 19 ↗` / `2M ↗`.
- `src/panels/CamerasPanel.tsx`: `DOT` in the coverage text, footer source names (`511GA` etc.: `title` = `"<State> DOT traveller site"`).
- `src/panels/AoiPresets.tsx`: `SE` (Southeast), `DIXIE` (Dixie Alley: the tornado-prone Deep South), `PLAINS`.
- `src/panels/LayoutMenu.tsx`: no acronyms expected; check only.
- `src/map/LayerControl.ts`: tag known glossary terms inside layer labels (`GOES`, `IR`, `SPC`, `NEXRAD`, `SRV`, `NWS`). It's DOM, so wrap each matching word in `<abbr class="abbr" title=expand(word)>`. Label strings stay owned by their layer modules; tag at render time by splitting on word boundaries.
- `src/map/velocity.ts`: `SRV` and the radar site id (`KCLX`: `title` = `NEXRAD radar site <id>`).
- `src/ui/glossary.ts` is orchestrator-only. **Report** every term you need added (e.g. `EXP`, `KM`, `KIWISDR`, `OPENMHZ`, `SE`, `DIXIE`, `PLAINS`, `511`) with its proposed one-line text. The orchestrator adds them at merge. Until then, use `<Abbr term="X" title="…">` with the same wording.

## Forbidden
Files owned by WP-35…38 this wave: `Topbar.tsx`, `App.tsx`, `StreamsGrid.tsx`, `AlertsList.tsx`, `OutlookRisk.tsx`, `OutlookDayControl.ts`, `spcOutlook.ts`. Also `src/ui/*`, `src/state/*`, `src/lib/*`.

## Build
- React files: `import { Abbr } from '../ui'`.
- DOM files: `import { expand } from '../ui'`, set `title` and the `abbr` class. `abbr.abbr` styling comes from the kit CSS.
- **Never** put an `Abbr` inside an element whose accessible name is computed from text in a way that changes (WCAG 2.5.3). Visible text is unchanged by `Abbr`, so names stay the same. Re-check the ThreatButton test.
- Don't tag inside `<option>` elements (no markup allowed there); give the `<select>` a `title` instead.

## Acceptance
- [ ] A test per touched React file asserting that the expected `abbr[title]` elements render (e.g. ThreatButton renders an `abbr` for TOR whose title starts with "Tornado Warning").
- [ ] A LayerControl test: the `GOES IR` label renders two `abbr` elements with the glossary titles.
- [ ] `grep` sanity in your report: list any static uppercase acronym left untagged in your files, and why.
- [ ] Orchestrator live check: hover tips appear and the help glossary covers every new term; no layout shift (the top bar still fits one row at 1920).
- [ ] `npm run typecheck && npm run lint && npm test && npm run build:ui` pass.
