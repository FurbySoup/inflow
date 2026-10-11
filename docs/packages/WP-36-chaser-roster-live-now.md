# WP-36 — Chaser roster, LIVE NOW and "chaser went live"
Wave 9 · Depends on prep P9b (`emitNotify`) and P9d (`config/chasers.json`, verified) · ADRs: 0009, **0013**, 0017, 0019, 0012, 0014, 0018

## Goal
Today the streams panel only knows the hand-curated `config/streams.json` entries. Add the verified roster of 58 regular chasers and live-coverage channels:
- check their liveness slowly, round-robin;
- surface whoever is live: a LIVE NOW index plus live tiles, AOI-relevant first;
- emit a "chaser went live" event for WP-35's notifications;
- add a Spotter Network map link-out (the v1 answer to "where are the chasers").

## Owns
- New `src/sources/chasers/**` (+ tests): roster loader, scheduler, store, diff.
- `src/panels/StreamsGrid.tsx`, including its acronym tags (ADR-0018: `THUMBS`, `SN`).
- New `src/panels/LiveNow.tsx` (+ test).

## Forbidden
- `config/chasers.json`: orchestrator-owned verified data. **Never add, guess or edit a channel ID.**
- `config/streams.json`, `src/sources/streams/liveness.ts` (import `fetchChannelState` read-only), `src/state/*` (use `useStreams`, `emitNotify` as they are), `src/lib/*`, `src/ui/*`, `vite.config.ts`.

## Verified facts (2026-10-11)
- **`config/chasers.json`:** `{ verified, method, chasers: [{ id, name, handle, channelId, kind: 'chaser' | 'coverage', regions: string[], states: string[] }] }`.
  - 58 entries: 54 chasers and 4 coverage outlets (TN, AL, MS, IN).
  - `states: []` means national (no home region stated).
  - Each ID was confirmed on the channel's own `/streams` page; all streamed within the last 8 months.
- **Liveness:** `fetchChannelState(channelId)` in `src/sources/streams/liveness.ts` fetches `/api/youtube/embed/live_stream?channel=<ID>` and returns `{ videoId }` (live), `'offline'` (the page has `"video_id":"live_stream"`) or `'unknown'`.
  - Checked by curl for Ryan Hall, Max Velocity, TwisterChasers and Mississippi LIVE Weather (all offline at the time).
  - One fetch briefly lacked `video_id`; `unknown` covers that, so never treat unknown as offline.
- **Overlap with curated entries:** Freddy McKinney (`UCZSDkxJS7PRw9V0_Sm6U7jg`), Brandon Copic, Connor Croff, Tornado Paigeyy and Corey Gerken also appear in `config/streams.json`. De-dupe by `channelId`: the curated entry wins, and the roster result only updates its status.
- **Spotter Network map:** `https://www.spotternetwork.org/pages/map?lat=<lat>&lon=<lon>&zoom=<z>` → 200, public, no login.
  - The parameter is **`lon`**; `lng` is ignored.
  - Terms: personal, non-commercial use, and their position data may not be redisplayed (work-plan Wave 9 notes). So it's a **link-out only**; never fetch `/feeds/*` or `/misc/data.xml` (they carry PII).

## Build
- **Scheduler** (`scheduler.ts`, pure + a tiny store with `useSyncExternalStore`):
  - one channel every **10 s** while the tab is visible and every **60 s** while hidden, so a full pass of 58 takes about 10 min;
  - order: AOI-relevant channels first each pass (`states` ∩ AOI states, then national, then the rest);
  - a channel found live is re-checked every pass, so an ended stream drops within one pass;
  - results are `Map<channelId, { state: 'live' | 'offline' | 'unknown', videoId?, checkedAt }>`;
  - `unknown` keeps the previous state;
  - honour an AbortSignal; one request in flight at a time.
- **Went-live diff** (pure): an `offline`/never → `live` transition **after the first full pass** (the seed) emits:
  - `emitNotify({ kind: 'chaser-live', key: 'chaser:<channelId>:<videoId>', title: 'CHASER LIVE · <NAME>', body: '<name> is streaming live.', at, level: 'CHASER' })`;
  - for `kind: 'coverage'` the title is `COVERAGE LIVE · <NAME>`;
  - voice: never "alert" or "warning" (HANDOFF §1).
- **Feeds:** live roster channels become `LiveFeed`s (title = name, `youtube: { channelId }`, `states` from the roster, `liveKind: 'live'`).
  - They're appended to the curated feeds and sorted live-first, then in-AOI, then the rest. Use `sortStreams` / `isInAoi` from `src/sources/streams/layout.ts` read-only, or extend locally.
  - Offline roster channels never create tiles.
  - Thumbnails use the same snapshot mechanism (videoId from the roster result).
- **`LiveNow.tsx`:** a wrapping row of compact chips at the top of the streams panel: `LIVE NOW · 6`, then one chip per live channel (`● NAME`, plus the `IN AOI` badge when relevant).
  - Clicking a chip makes that feed the primary (`useStreams.setPrimary`).
  - Chips are buttons with `:focus-visible` and an accessible name starting with the visible name.
  - Overflow beyond 8 chips collapses into `+N MORE`, which expands.
  - When nobody is live: `NO ROSTER CHASERS LIVE · CHECKED <n>/<58>` (muted).
- **SN link-out** in the panel footer:
  - `SN MAP ↗` (`<Abbr term="SN" title="Spotter Network: chasers' shared GPS positions">`) built from the AOI centre with zoom 7;
  - `target=_blank`, `rel="noopener noreferrer"`.
- **CHASE preset** (single stream): LIVE NOW chips still render; picking one swaps the single stream.
- **Liveness polling budget (ADR-0013):** the roster adds 6 requests/min while visible and 1/min while hidden. State that in a comment.

## Acceptance
- [ ] `scheduler.test.ts` (fake timers, mocked `fetchChannelState`):
  - 10 s cadence visible, 60 s hidden;
  - AOI-relevant first;
  - unknown keeps the previous state;
  - one request in flight.
- [ ] `wentLive.test.ts`:
  - no events during the seed pass;
  - offline → live emits once with the right key and title;
  - the same videoId again → no event;
  - a coverage channel gets the COVERAGE title.
- [ ] De-dupe test: a curated entry sharing a channelId with the roster yields one feed.
- [ ] `LiveNow` render test: chips, `+N MORE`, click → `setPrimary`, the empty state.
- [ ] A test that `config/chasers.json` channelIds all match `^UC[A-Za-z0-9_-]{22}$` and are unique (guards future edits).
- [ ] Orchestrator live check: watch the CHECKED counter advance; with a live chaser, their chip and tile appear and a notification fires with the tab hidden; the SN link opens at the AOI centre; at 390×844 the chips wrap without horizontal scroll.
- [ ] `npm run typecheck && npm run lint && npm test && npm run build:ui` pass.
