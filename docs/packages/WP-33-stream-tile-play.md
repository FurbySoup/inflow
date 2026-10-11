# WP-33 — Play a thumbnail stream in place
Wave 8 · ADRs: 0012, 0013, **0017**, 0014, 0015 (design-wave kit ownership)

## Goal
User report (2026-10-11): since Wave 7 only the main feed can play, so nothing else can be started without replacing it. Let the user start up to 3 thumbnails live in place (ADR-0017).

## Owns
- Kit: `src/ui/StreamTile.tsx`, `src/ui/css/stream.css`, `.design-sync/previews/StreamTile.tsx`.
- App: `src/panels/StreamsGrid.tsx`, plus a new pure `src/sources/streams/playing.ts` (+ test).

## Forbidden
`src/state/*` (keep the playing set in StreamsGrid component state), `src/lib/*`, `src/ui/tokens.css`, `src/ui/index.ts`, other kit components, `vite.config.ts`.

## Build
- **`playing.ts`** (pure):
  - `startTile(playing: string[], id: string, max = 3): string[]` appends `id`, drops the oldest past `max`, and is a no-op if already present;
  - `stopTile(playing, id)`;
  - `prunePlaying(playing, feeds)` drops ids that became ENDED or OFFLINE, or became the primary.
- **StreamTile (kit):**
  - new optional props `playing?: boolean`, `onPlay?: () => void`, `onStop?: () => void`;
  - when `playing` and `embedUrl` are set on a thumbnail, render the iframe in the 16:9 frame instead of the still. Keep the **same iframe attributes as the primary**: `allow="autoplay; encrypted-media; picture-in-picture"`, and **never `referrerpolicy="no-referrer"`** (YouTube Error 153);
  - signifiers (ADR-0012), persistent and not hover-only:
    - `▶ PLAY` on the frame corner next to `▲ MAIN` while showing the still;
    - `■ STILL` while playing;
    - both `btn-console`, with `:focus-visible` and an `aria-label` starting with the visible text;
  - hidden or disabled with the status label for ENDED/OFFLINE feeds;
  - JSDoc: state the new affordance, signifier and feedback.
- **StreamsGrid:**
  - holds `playing` state;
  - a playing tile's `embedUrl` is `withAutoplay(<embed with mute=1>, true)`. Look at how `withSound` builds sound/mute; tiles are always muted;
  - pressing `▲ MAIN` on a playing tile promotes it and removes it from `playing`;
  - CHASE (single stream) shows no thumbnails, so nothing changes there;
  - liveness polling: playing tiles count as on-screen.
- **Preview:** add a `playing` example to `.design-sync/previews/StreamTile.tsx`. Use a static placeholder `embedUrl`, never a real channel id you haven't been given; an existing curated entry from `config/streams.json` is fine.

## Acceptance
- [ ] `playing.test.ts`: the cap of 3 drops the oldest; start is idempotent; prune drops ENDED and primary ids.
- [ ] A StreamTile render test: the still shows ▶ PLAY; `playing` shows an iframe without a `referrerpolicy` attribute and a ■ STILL button.
- [ ] Orchestrator live check: start 2 thumbnails while the main plays; all 3 run; a 4th stops the oldest; at 390×844 the buttons are ≥ 28 px (`pointer: coarse`) and nothing scrolls horizontally.
- [ ] `npm run typecheck && npm run lint && npm test && npm run build:ui` pass (kit change).
