# WP-13 — Stream lifecycle: ended broadcasts + autoplay discipline
Wave 4 · ADRs: 0009, 0013 (accept before launch), 0012

## Goal
Pinned broadcasts that have ended leave the grid for a collapsed `ENDED (n)` list; only the primary feed autoplays.

## Owns
`src/sources/streams/**`, `src/panels/StreamsGrid.tsx`.
Registry edit allowed: `config/streams.json`: add `until` to existing `videoId` entries (`"2026-10-11T06:00:00Z"` for the 2026-10-10 event).

## Forbidden
Everything else, including `src/ui/StreamTile.tsx`: autoplay is controlled through the `embedUrl` you pass. No live-check proxy (deferred by ADR-0013).

## Verified facts
- `normalizeStreams` builds embed URLs with `autoplay=1&mute=1` for every entry today (`src/sources/streams/curated.ts`).
- `StreamTile` already sets `loading="lazy"` on its iframe.
- No network facts needed.

## Build
- `StreamEntry.until?: string`.
- `ChaserStream` gains `until: string | null`, plus `embedUrl` **without** autoplay; `autoplayUrl(url)` (pure) adds `autoplay=1&mute=1`.
- `splitEnded(streams, now)` (pure) → `{ live, ended }`. `channelId` entries are never ended.
- `StreamsGrid`:
  - the primary gets `autoplayUrl(primary.embedUrl)` and thumbnails get the plain URL;
  - ended streams render below the grid in a list toggled by a `ConsoleButton` (`ENDED (n)`, `aria-expanded`). Each row has the title and a `↗` link-out, and no iframe;
  - re-evaluate `now` once a minute via one `setInterval`;
  - if the saved primary has ended, fall back to the first live stream.

## Acceptance
- [ ] Unit tests: `splitEnded` boundaries (`until` past, future, absent, channel entries); `autoplayUrl` is idempotent; primary fallback when the saved primary ended.
- [ ] Live (orchestrator): with `until` in the past for all but two entries, the grid shows 2 tiles and `ENDED (11)`; only the primary plays on load.
- [ ] Checks pass.
