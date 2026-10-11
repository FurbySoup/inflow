# WP-23 — Stream thumbnails as snapshots + ▲ promote
Wave 7 · Depends on prep P7b · ADRs: 0009, 0012, 0013, 0014, **0015** · Spec: HANDOFF.md §9 items 7 + 10 ("thumbnails are snapshots refreshed every 15 s with a SNAP label; only the primary stream plays live"); `Console.dc.html` ~lines 186-225 (markup), 375-390 (rules)

## Goal
Only the main feed plays video. Thumbnails become still snapshots refreshed every 15 s, which cuts CPU and network with 10+ feeds. A ▲ button promotes a thumbnail to the main slot.

## Owns (ADR-0015)
- Kit: `src/ui/StreamTile.tsx`, `src/ui/css/stream.css`, `.design-sync/previews/StreamTile.tsx`.
- App: `src/panels/StreamsGrid.tsx`, `src/sources/streams/**`.

## Forbidden
`src/state/*` (use `useStreams`), `src/ui/tokens.css`, `src/ui/index.ts`, other kit components.

## Build
- **Snapshot source** (keyless image, no CORS needed for `<img>`):
  - YouTube live thumbnails `https://i.ytimg.com/vi/{videoId}/hqdefault_live.jpg`, falling back to `hqdefault.jpg`;
  - curl-verify both for a live and an ended id first and record the result in a code comment;
  - for channel entries, use the resolved video id from liveness (ADR-0013); if none is known, show the placeholder.
- **Thumbnail tile:**
  - `<img>` refreshed every 15 s with a `?t=` cache-buster;
  - a `SNAP 12s` age label (tabular-nums), sand when older than 60 s;
  - status LED shape from the existing liveness status (live/ended/offline/unknown);
  - placeholder copy per the spec: `◐ STALE`, `○ OFFLINE`, `connecting…`.
- **Controls:** `▲` promote button (persistent signifier, replaces `⇱ MAIN` on thumbs) → `useStreams.setPrimary`. The caption click still promotes, and the link-out `↗` stays.
- The primary keeps the iframe, sound toggle and MAIN tag, and keeps ENDED/OFFLINE behaviour (no autoplay unless live).
- Header meta: `N/M LIVE · THUMBS SNAPSHOT 15s`.
- Refresh images only for on-screen thumbs (reuse the existing IntersectionObserver).
- Update the StreamTile preview: a primary, a live snapshot thumb, and offline/ended thumbs.

## Acceptance
- [ ] Tests: snapshot URL builder (video vs channel-with-resolved-id vs unknown), age label, which tiles refresh (on-screen only).
- [ ] At most one `<iframe>` in the feeds panel at any time (orchestrator verifies in DevTools).
- [ ] ADR-0012 signifiers on ▲, caption and ↗; read-only snapshot age.
- [ ] Orchestrator live check: thumbs update every ~15 s; promote works; check at 390×844.
- [ ] `npm run typecheck && npm run lint && npm test` pass.
