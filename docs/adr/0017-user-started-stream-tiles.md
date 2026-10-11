# 0017. User-started stream tiles may play
Status: Proposed
Date: 2026-10-11
Amends: 0013 (only the primary feed mounts an iframe).

## Context
Wave 7 (WP-23) made thumbnails stills and only the primary feed a player, to cut CPU with 10+ feeds. In use (2026-10-11 dev build), that leaves no way to watch a second feed without swapping the main one. During an outbreak a chaser wants two or three feeds live side by side.

## Decision
- A thumbnail gets a persistent `▶ PLAY` button. Pressing it mounts that tile's embed in place, with autoplay (the press is a user gesture) and **muted**. `■ STILL` returns it to the still.
- At most **3** user-started tiles play at once. Starting a fourth stops the oldest, which goes back to its still.
- User-started tiles are session state: they don't persist, and the WALL/CHASE presets don't start any.
- Liveness rules (ADR-0013) still apply: ENDED or OFFLINE tiles can't be started; they show their status instead.
- Only the primary may have sound. Unmuting a tile makes it the primary (`▲ MAIN`).

## Consequences
- The worst-case decode cost rises from 1 to 4 players, and that only happens by the user's choice.
- The kit `StreamTile` gains a playing state (an embed on a thumbnail), so re-sync Claude Design.
