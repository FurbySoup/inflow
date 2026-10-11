# WP-15 — Stream lifecycle (live check, channel fallback, visible-only autoplay)
Wave 4 · ADRs: 0009, **0013** (supersedes part of 0009), 0012

## Goal
Pinned broadcasts go dark mid-event (verified: Brandon Copic's `Syyvt9aidlQ` ended at 20:00Z and restarted as `6nTCsMwGwoY` at 20:06Z). The grid should know which feeds are live, fall back to the chaser's channel when a pinned video ends, show ENDED/OFFLINE honestly, and only run the iframes you can see.

## Owns
`src/sources/streams/**`, `src/panels/StreamsGrid.tsx`, `config/streams.json`.
Registry edit allowed: add the proxy entry `/api/youtube` → `https://www.youtube.com` in `vite.config.ts` (`rewrite` strips the prefix; no extra headers).

## Forbidden
Everything else, including `src/ui/*`. Show status with the existing `Badge` (e.g. `ENDED`, `OFFLINE`) and existing classes. If the kit needs a new primitive, stop and report.

## Verified facts (2026-10-10, curl)
- **Watch page** `GET /watch?v=<id>` → 200 HTML ~1.35 MB (318 KB gzip), **no ACAO** → via `/api/youtube`.
  - Live: `"liveBroadcastDetails":{"isLiveNow":true,…}` (7kQACmPd6Io).
  - Ended: `"isLiveNow":false,…,"endTimestamp":"2026-10-10T20:00:29+00:00"` (Syyvt9aidlQ).
  - Removed: `"playabilityStatus":{"status":"ERROR",…}`.
- **Channel resolve** `GET /embed/live_stream?channel=<UC…>` → 200 HTML ~155 KB (62 KB gzip), no ACAO. Contains `"video_id":"<current id>"` when live and `"video_id":"live_stream"` when offline. Verified: `UCPqLI_AohMn1jnFg8ocMyHA` resolved to Copic's new `6nTCsMwGwoY`.
- Don't use `/channel/<id>/live` (302 to `consent.youtube.com` from GB/EU). Don't use oEmbed: live and ended both return 200 (only "removed" is detectable).
- Verified channel ids: 7kQACmPd6Io → `UCZSDkxJS7PRw9V0_Sm6U7jg`; Syyvt9aidlQ → `UCPqLI_AohMn1jnFg8ocMyHA`. **Never guess ids**; add only ids read from a watch page's `"channelId":"…"` / `"externalChannelId"`.
- YouTube ToS restricts automated access; acceptable for local dev, **must be replaced with the Data API in v2** (ADR-0013).

## Build
- Config schema: `youtube` may carry **both** `videoId` and `channelId` (pin + fallback). Keep the existing two shapes valid. Add the two verified `channelId`s to their entries (curl other entries' watch pages to add more; record nothing unverified).
- `src/sources/streams/liveness.ts`:
  - pure `parseWatchPage(html) → 'live' | 'ended' | 'removed' | 'unknown'`;
  - pure `parseLiveStreamEmbed(html) → { videoId } | 'offline' | 'unknown'`;
  - fetchers via `/api/youtube`.
  - Commit **trimmed** HTML fixtures: just the relevant JSON fragments plus surrounding noise, a few KB, never the 1.3 MB page.
- Resolution per entry, re-checked every 5 min and **only for the primary + on-screen tiles** (IntersectionObserver):
  - pinned video live → as today;
  - pinned video ended/removed and `channelId` present → embed the channel's current live video if one exists, otherwise OFFLINE;
  - ended without `channelId` → ENDED.
- Sorting: live in AOI → live elsewhere → ENDED/OFFLINE → context feeds (extend `layoutStreams`; keep its tests green).
- **Autoplay only primary + visible tiles:** off-screen tiles drop `autoplay=1` (or unmount the iframe and keep the caption), so 10+ feeds don't all decode.
- ENDED/OFFLINE tiles keep the link-out and the ⇱ MAIN button (ADR-0012 signifiers unchanged).

## Acceptance
- [ ] Tests: both parsers against fixtures (live / ended / removed / offline), resolution table, sort order.
- [ ] Orchestrator live check: an ended pinned entry with a `channelId` shows the channel's current broadcast; one without shows ENDED; scrolling a tile off-screen stops its autoplay; the network panel shows no liveness requests for off-screen tiles.
- [ ] `npm run typecheck && npm run lint && npm test` pass.
