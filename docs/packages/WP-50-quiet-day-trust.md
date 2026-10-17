# WP-50 — Quiet-day trust and empty states
Wave 13 · ADRs: 0012, 0013, 0017, 0018 · Source: `docs/polish-plan.md`

## Goal
Most first visits happen on a quiet weather day, and right now a quiet day looks broken or, worse, falsely safe. Fix the three things a first-time reviewer hit:
- the alerts panel claims "no alerts" before NWS has answered;
- the main video slot embeds YouTube's "This video is unavailable" page;
- the scanner opens on a system hundreds of miles away.

## Owns
- `src/panels/AlertsList.tsx`, `src/panels/alertGeometry.ts` (+ `alertGeometry.test.ts`)
- `src/panels/StreamsGrid.tsx` (+ `StreamsGrid.test.tsx`), new `src/panels/FeedsQuiet.tsx` (+ test) and `src/panels/feeds-quiet.css` (imported by it)
- `src/panels/AudioPanel.tsx` (+ test), `src/sources/openmhz/systems.ts` (+ test)

## Forbidden
`src/ui/*` (kit: use `AlertList` and `StreamTile` as they are), `src/index.css`, `src/state/*`, `src/lib/*`, `src/panels/help/*`, `src/map/*`. If one must change, stop and report the diff.

## Verified facts (on `main`, 2026-10-17)
- **The false all-clear.** `alertsView({ isError, hasData, rows })` in `src/panels/alertGeometry.ts:48` returns `'empty'` whenever there is no error and no rows. That includes the pending first load (`hasData: false`). `AlertsList.tsx:74-81` then renders `NO ACTIVE ALERTS IN AOI` and "NWS checked --:--:--Z". A reviewer saw this on a fresh load.
- The kit `AlertList` takes `empty: { label, note } | null` and `feedError`. There is no loading prop, so render the loading state by passing `empty={{ label: 'CHECKING NWS…', note: '…' }}`. That's fine; it is just text.
- **The streams.** `StreamsGrid.tsx` computes `sorted` (feeds, live first) and `layoutStreams(sorted, primaryId, chosenThisSession)` → `{ primary, thumbs }`, then renders a primary `StreamTile` (which embeds the YouTube player) plus thumbs.
  - Feed `status` is one of `live | ended | offline | unknown | undefined` (`src/sources/streams/resolve.ts`).
  - The LiveNow line and `<MyChasers />` render above the tiles.
  - `ROSTER.length` is 58; curated streams are 5 national channels.
- **The scanner.** `AudioPanel.tsx:62-67` picks `systems.find(picked) ?? systems[0]`. `systemsInAoi(...)` returns systems sorted by state then name (`normalizeSystems`), so a Kansas-centred view opens on an Alabama system.
  - `ScannerSystem` has `state` but no coordinates.
  - `useAoi().states` is **nearest-to-the-centre first** (`statesInBbox`, ADR-0016).

## Build
- **Alerts:**
  - add `'loading'` to `AlertsView`: no error and no data yet → `loading`;
  - the panel renders `empty={{ label: 'CHECKING NWS…', note: 'Waiting for the first answer from the National Weather Service.' }}`;
  - the real empty state becomes `label: 'NO WARNINGS IN THIS AREA'`, `note: \`NWS checked ${formatZulu(lastGood)}. New warnings appear within a minute; tornado warnings also pop up on screen. Watches and outlooks stay on the map.\``;
  - the meta `0 ACTIVE` shows `— ACTIVE` while loading.
  - Never write "all clear", "safe" or "no threat".
- **Feeds when nobody is live:** when no feed has status `live`, don't render the primary `StreamTile` (no YouTube embed). Render `<FeedsQuiet />` instead: a calm slate in the primary slot.
  - Heading: `NO CHASERS LIVE RIGHT NOW`.
  - Body: "INFLOW checks 58 chasers and storm-coverage channels and shows them here when they go live. On a quiet day, the SPC outlook days (D1–D8) on the map show where storms are expected."
  - Under the slate, a compact one-line list of the offline curated feeds: their names, each a `↗` link to the channel (the existing `watchUrl`, `target="_blank" rel="noopener noreferrer"`). It replaces the five OFFLINE tiles while nobody is live.
  - Run the body text through `TaggedText`, so SPC and D1 get tips.
  - As soon as any feed is live, the grid returns to today's behaviour.
  - A user's in-session pick of an offline feed (`chosenThisSession`) still shows that tile, because they asked for it.
- **Thumbnails:** hide `▲ MAIN` on offline and ended thumbnails. There's nothing to promote.
- **Liveness checks:** `useLiveness` must still check the curated feeds while the slate is shown. Today it runs for on-screen tiles, so treat the quiet-list entries as on screen. Otherwise nothing would ever turn live. Test this.
- **Scanner:**
  - sort `systemsInAoi` results by the index of their state in the AOI's nearest-first `states`, then by name, so the default is the nearest state's system;
  - keep the user's explicit pick;
  - add one muted hint line under the system select: "Recorded calls from public-safety radio, newest first."
- **ADR-0012:** the quiet slate is read-only and must not look clickable. Links keep the underline + ↗ signifier. Tokens only in CSS, no fixed widths (ADR-0014).

## Acceptance
- [ ] `alertGeometry.test.ts`: `loading` while pending, `empty` only after data, `degraded`/`unavailable` unchanged.
- [ ] `AlertsList` test or panel test: the loading text shows before data, never `NO WARNINGS` before the first success.
- [ ] `StreamsGrid.test.tsx`:
  - all offline → no iframe, the slate text present, a ↗ link per curated feed, no `▲ MAIN` on offline thumbs;
  - one live → the primary tile with an iframe returns;
  - liveness still requested for the curated ids while quiet (assert on the `useLiveness` mock's predicate).
- [ ] `AudioPanel` / `systems` test: with AOI states `['KS','OK','AL']`, the default system is a KS one.
- [ ] `set -o pipefail; npm run typecheck && npm run lint && npm test && npm run build:ui` pass.
