# 0018. Every acronym carries its expansion
Status: Accepted
Date: 2026-10-11

## Context
Severe weather is acronym-dense: AOI, TOR, SVR, PDS, SPC, MD, SLGT, SRV, NEXRAD, GOES, CB, TG… The console keeps labels short on purpose (HANDOFF §1 voice), which raises the bar for anyone who isn't already a chaser. The user asked (2026-10-11) that every static use of an acronym or abbreviation have a mouse-over tip.

## Decision
- **One glossary:** `src/ui/glossary.ts` (`GLOSSARY`, `expand(term)`). It's kit-level, so kit components and the app share one wording. Panel codes (`WX-02`) expand by prefix.
- **One primitive:** kit `Abbr` renders `<abbr class="abbr" title="…">`.
  - Signifier: a dotted underline and the help cursor (ADR-0012), so the tip is discoverable.
  - Read-only: not focusable, no click.
  - A term missing from the glossary renders as plain text, so a typo never shows an empty tip.
- **Kit components tag their own labels:** hazard chips, PDS, ZONE, EMERGENCY, IN AOI / CTX badges, panel codes, CAM, THUMB, NWS, and the `T-` countdowns (via `title`).
- **App code uses `Abbr`** for every other static acronym, e.g. top-bar AOI / UTC / LOCAL, SPC categories, layer names.
  - DOM-built map controls set the same `title` from `expand()` and add the `abbr` class to the term.
- **Hover is never the only path (ADR-0012, ADR-0014):** the help dialog (`? HELP`, shown on touch screens too) lists the whole glossary. Tooltips don't exist on touch.
- **New acronym on screen → glossary entry in the same change.** Verifiers check this.

## Consequences
- The glossary is the single place to fix wording; kit and app can't drift.
- Dynamic text from upstream (NWS headlines, area names, stream titles) isn't tagged. Only labels we author are.
- The kit changed (Abbr plus tips in 5 components), so re-sync Claude Design.
