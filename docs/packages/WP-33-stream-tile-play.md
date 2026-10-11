# WP-33 — Watch a thumbnail stream in place + LIVE vs REPLAY labels
Wave 8 · ADRs: 0012, 0013, **0017**, 0014, 0015 (design-wave kit ownership)

## Goal
User report and spec (2026-10-11):
- Since Wave 7 only the main feed plays. Autoplay on load stays off for everything except the confirmed-live primary.
- Instead, the user **selects** a thumbnail to start it in its own sub-window, **sound off**, up to 3 at once (ADR-0017).
- Every sub-window must show clearly whether it's an **actual live stream** or a **playback** (an ended broadcast or pinned past video), or a still.

## Owns
- Kit: `src/ui/StreamTile.tsx`, `src/ui/css/stream.css`, `.design-sync/previews/StreamTile.tsx`.
- App: `src/panels/StreamsGrid.tsx`, plus a new pure `src/sources/streams/playing.ts` (+ test).

## Forbidden
- `src/state/*`: keep the playing set in StreamsGrid component state.
- `src/lib/*`, `src/ui/tokens.css`, `src/ui/index.ts`, other kit components, `vite.config.ts`.
- `resolve.ts` `shouldAutoplay`: the primary's rule doesn't change.

## Build
- **`playing.ts`** (pure):
  - `startTile(playing: string[], id: string, max = 3): string[]` appends `id`, drops the oldest past `max`, and is a no-op if already present;
  - `stopTile(playing, id)`;
  - `prunePlaying(playing, feeds)` drops ids that became OFFLINE or became the primary;
  - `liveKind(status, pinnedVideo: boolean)` returns `'live' | 'replay' | 'offline' | 'unchecked'`:
    - `live` only when the liveness status is `live`;
    - `replay` for `ended`, or for a pinned `videoId` that isn't confirmed live;
    - `offline` and `unchecked` (`unknown`) otherwise.
- **StreamTile (kit), new optional props:** `liveKind?: 'live' | 'replay' | 'offline' | 'unchecked'`, `playing?: boolean`, `onPlay?: () => void`, `onStop?: () => void`.
  - **Live-kind tag** on the frame's top-left, on every tile including the primary. It is never colour alone (ADR-0012):
    - `● LIVE`: `--status-live` / alert-red family per tokens, solid;
    - `↺ REPLAY`: `--text-muted` outline;
    - `○ OFFLINE`: muted;
    - `◌ UNCHECKED`: muted.
    - It's read-only: no border that looks like a button, and no pointer.
    - It replaces the `statusLabel` caption tag for these states; keep `statusLabel` working for callers that pass it.
  - **Still vs playing:**
    - a still shows its existing `THUMB ≤5m` age label;
    - a playing tile shows `PLAYING · MUTED` instead, so a still is never mistaken for video, and vice versa.
  - **Start or stop**, persistent on the frame corner next to `▲ MAIN`, `btn-console`, `:focus-visible`, with an `aria-label` that starts with the visible text:
    - `▶ WATCH` while showing the still;
    - `■ STILL` while playing;
    - not rendered for `offline`.
  - When `playing` and `embedUrl` are set on a thumbnail, render the iframe in the 16:9 frame instead of the still. Use **the same iframe attributes as the primary** (`allow="autoplay; encrypted-media; picture-in-picture"`); **never `referrerpolicy="no-referrer"`** (YouTube Error 153).
  - JSDoc: state the new affordances, signifiers and feedback.
- **StreamsGrid:**
  - holds `playing` state;
  - passes `liveKind` to the primary and every thumbnail;
  - a playing tile's `embedUrl` is the feed's embed with `mute=1` and `autoplay=1`. Building it with `withAutoplay(…, true)` is fine: it runs only after the WATCH press, which is a user gesture, never on load;
  - pressing `▲ MAIN` on a playing tile promotes it and removes it from `playing`;
  - CHASE (single stream) shows no thumbnails, so nothing changes there;
  - liveness polling: playing tiles count as on-screen;
  - the panel `meta` (`n/m LIVE`) is unchanged.
- **Preview:** add `live` + still, `replay` + playing, and `offline` examples to `.design-sync/previews/StreamTile.tsx`. Use a curated entry from `config/streams.json` for any embed URL; never invent a channel or video id.

## Acceptance
- [ ] `playing.test.ts`:
  - the cap of 3 drops the oldest;
  - start is idempotent;
  - prune drops OFFLINE and primary ids;
  - `liveKind` covers live, ended, a pinned unconfirmed video, and unknown.
- [ ] StreamTile render tests:
  - a still shows `▶ WATCH` and `● LIVE`;
  - `playing` shows an iframe without a `referrerpolicy` attribute, `■ STILL` and `PLAYING · MUTED`;
  - offline has no WATCH button.
- [ ] Nothing mounts an iframe on load except the primary (a test with no presses: one iframe).
- [ ] Orchestrator live check:
  - start 2 thumbnails while the main plays; all 3 run muted; a 4th stops the oldest;
  - LIVE and REPLAY read correctly;
  - at 390×844 the buttons are ≥ 28 px (`pointer: coarse`) and there's no horizontal scroll.
- [ ] `npm run typecheck && npm run lint && npm test && npm run build:ui` pass (kit change).
