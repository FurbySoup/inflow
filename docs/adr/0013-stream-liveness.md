# 0013. Stream liveness via a YouTube page proxy (local only)
Status: Accepted
Date: 2026-10-10
Supersedes: the "Consequences" of 0009 regarding offline/ended streams.

## Context
ADR-0009 curates streams by `channelId` or a pinned `videoId`. During the 2026-10-10 GA/SC live-proofing event, a pinned broadcast ended mid-event and the chaser restarted under a new id 6 minutes later. The pinned tile went dark while the chaser was live again. Without an API key (ADR-0001) there's no official liveness signal.

Verified keyless signals (curl, 2026-10-10):
- The watch page HTML carries `liveBroadcastDetails.isLiveNow` (true/false + `endTimestamp`) and `playabilityStatus.status: ERROR` for removed videos.
- `embed/live_stream?channel=<id>` HTML carries `"video_id":"<current>"`, or `"live_stream"` when offline.
- oEmbed can't distinguish live from ended. `/channel/<id>/live` hits a consent redirect from GB/EU.
- Neither page sends CORS headers.

## Decision
- Add a dev proxy route `/api/youtube` → `https://www.youtube.com` (ADR-0005 pattern).
- Config entries may carry **both** `videoId` (pin) and `channelId` (fallback). Prefer `channelId` for regular chasers.
- Check liveness only for the primary and on-screen tiles, at most every 5 min, by parsing those two pages with pure, fixture-tested parsers. Ended pins fall back to the channel's current live video, otherwise they're badged ENDED/OFFLINE and sorted after live feeds.
- Autoplay only the primary and visible tiles.

## Consequences
- Scraping YouTube HTML is a ToS grey area. It's acceptable for a local, single-user tool and **not acceptable for the hosted v2**: there, the Worker uses the YouTube Data API with a secret key (roadmap v2), and this route is removed.
- Parsers break if YouTube changes its markup. On failure they return `unknown`, and the tile behaves as it did before this ADR (embed as configured, no badge).
- Adds roughly 60–320 KB gzip per check per visible tile. The visibility gate and 5-min cadence bound it.
