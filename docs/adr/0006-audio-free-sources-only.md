# 0006. Audio: free/embeddable sources only
Status: Accepted
Date: 2026-10-10

## Context
Most US scanner audio is on Broadcastify, whose API and embeds require a paid licence. The user wants scanner, ham (SKYWARN nets) and CB coverage without licensing risk.

## Decision
- **Scanner:** OpenMHz recorded calls (mp3 per call) played in-app via `<audio>`, for systems mapped to AOI states. Plus any curated public Icecast stream URLs in `config/audio.json`.
- **Ham / CB:** KiwiSDR public receivers nearest the AOI, shown as **link-outs** (new tab) preset to CB ch. 19 (27.185 MHz AM) and local 2 m SKYWARN repeater frequencies where known. No iframes: receivers are mostly HTTP and would break under HTTPS hosting.
- `AudioFeed.streamUrl` is set only for directly playable, permitted streams; otherwise `pageUrl` is set and the UI renders an external link.
- No Broadcastify integration.

## Consequences
- Coverage is patchy (e.g. no Nebraska OpenMHz systems). The panel must show "no feeds in AOI" clearly rather than look broken.
- OpenMHz is calls-on-demand, not a continuous stream: the panel plays the latest calls queue.
