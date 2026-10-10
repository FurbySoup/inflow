# 0013. Stream lifecycle: ended broadcasts and autoplay
Status: Proposed
Date: 2026-10-10

## Context
ADR-0009 curates streams in `config/streams.json`. During the 2026-10-10 live-proofing storm all 13 entries were pinned `videoId`s. When a chase ends, a pinned broadcast becomes a replay or goes dark, but it stays in the grid at full weight. All 13 iframes also autoplay, which costs CPU and starves the map on a wall display.

A real live check needs either the YouTube Data API (a key, so excluded by ADR-0001) or a server-side read of the watch page (`isLiveNow`) through a dev proxy. As of 2026-10-10 that read is UNVERIFIED: the planning session's network could not reach youtube.com.

## Decision
Supersedes the "none are hidden" and "embeds autoplay" parts of ADR-0009. Everything else in 0009 stands.
- **Curator-set expiry.** A `videoId` entry may carry `until` (ISO timestamp). Once `now > until`, the entry counts as **ended**. `channelId` entries never expire, because they always embed whatever is live now.
- **Ended streams leave the grid.** They move to a collapsed `ENDED (n)` list below it, which shows title plus link-out only and no iframe. A persistent console button toggles the list (ADR-0012).
- **Autoplay discipline.** Only the primary feed autoplays (muted). Thumbnails load lazily and play only when the user clicks inside the player.
- **Purity.** `normalize`/`sort` take `now` as an argument; components read the clock, never the pure functions.
- **Live check: deferred.** If a curl check from an allowed network confirms a stable `isLiveNow` marker and no consent-wall redirect, a later ADR adds an `/api/youtube` dev-proxy route and an automatic ended state.

## Consequences
- Adding a pinned broadcast needs an `until` (usually end of the event day UTC). If it's missing, the entry behaves as it does today.
- Fewer simultaneous decoders: one autoplaying iframe instead of N.
- Regular chasers should move to `channelId` entries once their channel IDs are verified (never guessed).
