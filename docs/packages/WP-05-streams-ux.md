# WP-05 — Streams grid UX
Wave 1 · ADRs: 0007, 0009

## Goal
Make the chaser feed column usable with several streams: focus one stream large, AOI relevance badges, and per-stream "open on YouTube".

## Owns
`src/panels/StreamsGrid.tsx`, `src/sources/streams/**`.
Allowed: append entries to `config/streams.json` **only** if the orchestrator supplied channel IDs in the prompt. Never invent channel IDs.

## Forbidden
Everything else.

## Build
- Click a stream caption → that stream becomes "primary" (full width at top); others shown as a 2-column thumbnail grid below. Persist primary id in `localStorage` (wrap in try/catch).
- Badge `IN AOI` (accent) when `stream.states` intersects `useAoi().states`.
- Link `↗` opens `https://www.youtube.com/watch?v={videoId}` or `https://www.youtube.com/channel/{channelId}/live` in a new tab — extend `LiveStream` locally via a helper in `src/sources/streams/` (do not edit shared types; derive from `StreamEntry`).
- Do **not** set `referrerpolicy="no-referrer"` on iframes (YouTube Error 153).
- Support optional `"context": true` entries in config (e.g. NASA ISS Earth view) that always sort last and carry a `CTX` badge.

## Acceptance
- [ ] With ≥3 entries, primary/thumbnail layout works and survives reload.
- [ ] Tests for sort order (AOI first, context last) and watch-URL builder.
- [ ] Checks pass.
