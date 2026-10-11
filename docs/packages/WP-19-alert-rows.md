# WP-19 — INFLOW alert rows + NWS feed-error state
Wave 7 · Depends on prep P7a/P7b · ADRs: 0012, 0014, **0015** · Spec: `docs/design/inflow-v1/HANDOFF.md` §2, §6 (severity row), §9 items 3 + 10 (feed error); `Console.dc.html` ~lines 138-185 (markup) and 331-360 (rules)

## Goal
Restyle the alerts panel to the INFLOW severity-row spec and make a failed NWS feed impossible to mistake for "no warnings".

## Owns (ADR-0015 design-wave ownership)
- Kit: `src/ui/AlertList.tsx` (AlertList + AlertRow), `src/ui/css/alerts.css`, `.design-sync/previews/AlertList.tsx`, `.design-sync/previews/AlertRow.tsx`.
- App: `src/panels/AlertsList.tsx`, `src/panels/alertGeometry.ts` (+ its test).

## Forbidden
`src/ui/tokens.css`, `src/ui/index.ts`, other kit components, `src/lib/*` (use `src/lib/hazards.ts` as is), `src/types`. Need something else? Stop and report.

## Build
- **AlertRow** (keep the current props working; add what's below):
  - Hazard chip (fixed `--chip-w`) holding glyph + code from `hazardCode(event)`:
    - warning: solid `--hz-<code>` fill with `--hz-<code>-ink` text;
    - watch (`isWatch`): `--surface-raised` with a 2 px dashed hazard border;
    - PDS: TOR red plus an inset 2 px `--hz-pds-mark` ring;
    - OTHER: neutral `--surface-raised`.
  - Title weight 600 for TOR. Countdown `T-mm:ss` (`T-h:mm:ss` from 1 h), tabular-nums, `--hz-tor-text` 700 under 10 min, plus a thin remaining-time bar (fraction of onset→expires).
  - ⌖ box for polygon alerts (persistent signifier, ADR-0012); a ZONE badge for zone-based ones.
  - **Focused:** `--accent-fill` background, 1 px accent outline, ⌖ box filled accent.
  - **PDS:** 2 px outline alternating TOR/white at 1 Hz (`inflow-flash`), static double outline under reduced motion.
  - **Expired:** row stays 60 s at 60% opacity with strike-through, then leaves.
  - **Last-known (degraded):** 72% opacity.
- **AlertsList**:
  - Sort with `compareAlerts`; `emergency` comes from `isPds(a)` (replace the headline regex in alertGeometry.ts).
  - Header meta: `N ACTIVE · <age>` (age since the last successful fetch: `dataUpdatedAt`).
  - **Feed error:** while the query is in error after having had data, show the banner `NWS FEED ERROR · WARNINGS MAY BE MISSING` with:
    - the last-good time (Z);
    - `RETRY ↻` (`refetch()`), a quiet button;
    - `WEATHER.GOV ↗`, a link-out to https://www.weather.gov/.
    Keep rendering the last-known rows at 72%. Never show the empty state while in error.
  - Empty state copy: `NO ACTIVE ALERTS IN AOI` plus one sentence.
- Update both previews: hazard chips for each code, watch vs warning, PDS, focused, expired, and the error banner. Previews must render statically, so use fixed `remainingMs`.

## Acceptance
- [ ] Tests:
  - countdown formatting incl. ≥1 h;
  - expired-retention filter (pure helper: keep rows expired < 60 s);
  - remaining-fraction helper;
  - the error/last-known state chooser (pure).
- [ ] No hex colours in TS/CSS; tokens only.
- [ ] ADR-0012: ⌖ and controls have persistent signifiers, hover, `:focus-visible` and feedback; the chip is read-only and not bordered like a control.
- [ ] Orchestrator live check:
  - real alerts render with chips;
  - block `/api/nws` in DevTools and check the banner plus last-known rows;
  - check at 390×844 and 3840×2160.
- [ ] `npm run typecheck && npm run lint && npm test` pass.
