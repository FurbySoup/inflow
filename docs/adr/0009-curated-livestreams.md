# 0009. Curated livestreams, no YouTube API in v1
Status: Accepted
Date: 2026-10-10

## Context
Auto-discovering live "storm chase" streams needs a YouTube Data API key (quota-limited, a secret) — incompatible with ADR-0001.

## Decision
- Streams are curated in `config/streams.json`: `{ id, title, youtube: { channelId } | { videoId }, states[] }`.
  - `channelId` → `embed/live_stream?channel=…` (whatever the channel is streaming now).
  - `videoId` → pins a specific broadcast (used for the 2026-10-10 GA/SC live-proofing stream `7kQACmPd6Io`).
- Embeds autoplay muted. Streams in the AOI sort first; none are hidden.
- Optional context feed: NASA ISS Earth-view live stream may be added as a curated entry with `states: []` (sorts last). Useful ambience, rarely shows the AOI — satellite imagery (GOES) is the real "view from space" (WP-03).

## Consequences
- Offline channels render YouTube's own offline state (behaviour UNVERIFIED). Revisit with the API (behind the hosted Worker) post-v1.
- Adding a chaser is a config change, no code.
