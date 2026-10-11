# 0017. User-started stream tiles may play
Status: Accepted
Date: 2026-10-11
Amends: 0013 (only the primary feed mounts an iframe).

## Context
Wave 7 (WP-23) made thumbnails stills and the primary the only player, to cut CPU with 10+ feeds. Autoplay is limited to a confirmed-live primary. In use (2026-10-11 dev build), that leaves no way to watch a second feed without swapping the main one. During an outbreak a chaser wants two or three feeds live side by side.

## Decision
- **No autoplay on load** (user, 2026-10-11): nothing but the confirmed-live primary starts by itself. A tile plays only after the user presses its persistent `▶ WATCH` button.
  - The press mounts that tile's embed in place with sound **off**.
  - The embed carries `autoplay=1`, so one press starts it; the press is the user gesture, not autoplay on load.
  - `■ STILL` returns the tile to its still.
- **Every tile says whether it is live, and the label is never colour alone:**
  - `● LIVE`: confirmed live by the liveness check;
  - `↺ REPLAY`: an ended broadcast or pinned past video, which plays as a recording;
  - `○ OFFLINE`;
  - `◌ UNCHECKED`: not checked yet.
  - A playing tile also says `PLAYING`, so a running player is never mistaken for a still, and vice versa.
- ~~At most 3 user-started tiles play at once; starting a fourth stops the oldest.~~ **Amended 2026-10-11 (user, after the live check):** there is no cap. Silently stopping the oldest read as a bug (a start elsewhere paused a feed the user was watching, with no feedback). A started tile plays until the user presses `■ STILL` or promotes it.
- User-started tiles are session state: they don't persist, and the WALL/CHASE presets don't start any.
- Liveness rules (ADR-0013) still apply: OFFLINE tiles can't be started. An ENDED tile can be watched, but it's labelled `↺ REPLAY`.
- Only the primary may have sound. Unmuting a tile makes it the primary (`▲ MAIN`).

## Consequences
- Decode cost grows with each tile the user starts (one player per started tile, plus the primary). That cost is the user's choice; all tiles are muted.
- The kit `StreamTile` gains a playing state (an embed on a thumbnail), so re-sync Claude Design.
