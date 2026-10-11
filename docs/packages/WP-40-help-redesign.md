# WP-40 — Help redesign: shortcuts, on-screen glossary, chaser terms
Wave 9 · Depends on prep P9a (`GLOSSARY`) and P9c (`src/panels/help/chaserTerms.ts`) · ADRs: 0012, 0014, 0018

## Goal
User request (2026-10-11): the help should also explain the terms chasers use on streams (wall cloud, RFD, couplet, CAPE…), and it must not be one long vertical list.
- Today `? HELP` opens a narrow dialog: about 14 shortcut rows, then 41 glossary rows, in a single column.
- Redesign it into a compact, searchable, tabbed reference that also works at 390 px.

## Owns
- The help dialog part of `src/panels/KeyboardShortcuts.tsx`. Extract it into new `src/panels/help/HelpDialog.tsx` and keep the keyboard handler where it is.
- New `src/panels/help/help.css` (tokens only), `src/panels/help/helpSearch.ts` (+ test), `HelpDialog.test.tsx`.

## Forbidden
- `src/panels/help/chaserTerms.ts` (orchestrator-authored content). Report wording problems instead of editing.
- `src/ui/glossary.ts`, `src/ui/*`, `src/state/*`, `src/lib/*`, `Topbar.tsx` (WP-35 edits it this wave).
- The shortcut behaviour in `shortcuts.ts`.

## Content (all exists)
- **Shortcuts:** the existing `ROWS` in `KeyboardShortcuts.tsx` (keys + label).
- **On screen:** `GLOSSARY` from `../../ui`, 41 entries today, more after WP-39. Group them for display with a static map in `HelpDialog.tsx`:
  - Area & time: AOI, IN AOI, UTC, Z, LOCAL, T-;
  - Agencies & products: NWS, SPC, MD, HWO, CWA;
  - NWS alerts: TOR, SVR, FFW, TOA, SVA, SPS, OTHER, PDS, EMERGENCY, ZONE;
  - SPC risk: TSTM … HIGH;
  - Radar & satellite: NEXRAD, SRV, GOES, IR;
  - Streams & cameras: CTX, THUMB, CAM, DOT, CCTV;
  - Radio: CB, 2M, RX, TG, SDR;
  - anything not in the map goes into `Other`, so a new glossary term is never lost.
- **Chaser terms:** `CHASER_TERMS`, 5 groups and about 78 terms, each with an optional `stands`.

## Build
- **Layout:** the dialog is `width: min(72rem, 100% - 24px)` and `height: min(44rem, 100% - 24px)`. The header and tab bar stay fixed and only the body scrolls.
  - **Tabs** (WAI-ARIA tabs pattern: `role=tablist`, arrow keys move between tabs, the selected tab is solid accent): `SHORTCUTS` · `ON SCREEN` · `CHASER TERMS`.
    - Default tab: `SHORTCUTS` on a fine pointer, `ON SCREEN` on touch.
    - Remember the last tab in localStorage (try/catch).
  - **Search** (`type=search`, placeholder `Search terms`, `aria-label="Search help"`): filters the active tab live, matching the term, `stands` and meaning, case-insensitive.
    - Typing while on SHORTCUTS jumps to the first tab with matches.
    - Show `N MATCHES` and an empty state like `NO TERMS MATCH "xyz"`.
    - The global shortcuts must ignore keys typed here; `isTypingTarget` already covers inputs, but verify.
  - **Terms layout:** a group heading (UPPERCASE muted), then a responsive grid `repeat(auto-fill, minmax(17rem, 1fr))` of compact entries:
    - the term, mono accent;
    - `stands` in muted small caps;
    - the meaning, sentence case, 2–3 lines.
    - This gives 3–4 columns on desktop and 1 on a phone. Group headings span the full row.
  - **Shortcuts layout:** a 2-column grid on desktop (keycaps, then the label), 1 column under 640 px. Keep the existing note about typing and YouTube focus as a one-line footer.
  - A group jump bar under the search on the term tabs (buttons for each group heading that scroll to it), wrapping, no horizontal scroll.
- **Behaviour kept:** Esc and the header close button close it; focus is trapped; focus returns to the opener; the click-outside backdrop; `?` toggles; the `KBD-01` panel chrome becomes code `HLP-01`, title `Help`.
- **`helpSearch.ts`** (pure): `filterGroups(groups, query)` returns the groups with only matching items and drops empty groups. Shared by both term tabs.
- **Wave 7/ADR-0012:** every tab and jump button has `:focus-visible` and hover styles; the search box has a visible focus ring; nothing is hover-only.

## Acceptance
- [ ] `helpSearch.test.ts`: matches on the term, `stands` and meaning; case-insensitive; empty groups dropped; empty query returns everything.
- [ ] `HelpDialog.test.tsx`:
  - the tabs switch with click and with arrow keys;
  - searching "rfd" shows the Rear-flank downdraft entry on CHASER TERMS;
  - searching "tor" on ON SCREEN shows TOR;
  - a glossary term missing from the group map appears under `Other` (inject one);
  - Esc closes and focus returns.
- [ ] Orchestrator live check:
  - at 1920 the CHASER TERMS tab shows ≥ 3 columns and no page scroll;
  - at 390×844 one column, the tabs and search reachable without horizontal scroll, the dialog fits the screen and only its body scrolls;
  - keyboard: Tab order is close → tabs → search → content.
- [ ] `npm run typecheck && npm run lint && npm test && npm run build:ui` pass.
