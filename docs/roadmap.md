# Roadmap — beyond v1

v1 = local-only, keyless, client-only (ADR-0001). This plans the path to a hosted product. Each phase gets its own ADRs when started.

## v1.1 — Coverage polish (still local)
Scheduled 2026-10-10 as Wave 4/5 (`docs/work-plan.md`, WP-11…17). Not yet packaged: FL511/ALGO cameras, Oklahoma cameras, multi-platform streams, a YouTube live-check proxy (deferred by ADR-0013).

- GA/SC/FL/AL DOT camera adapters (511GA, SC511, FL511, ALGO) — the 2026-10-10 live-proofing storm exposed the Plains-only camera gap.
- Oklahoma cameras once verifiable from a US network.
- Watch outlines: resolve zone-based alerts' `affectedZones` to geometry (cache zone shapes in IndexedDB).
- Mesoscale discussions + watch boxes from SPC.
- Multi-AOI presets (Plains, Dixie Alley, Southeast) in the top bar.
- Streams: multi-platform entries (Twitch `player.twitch.tv/?channel=…&parent=<host>`, Kick `player.kick.com/<channel>`) — searched 2026-10-10, no strong outbreak coverage there yet; aggregators (TVN, Storm Chasing Video) block framing → link-out only.
- Streams: auto-prune ended broadcasts (pinned `videoId`s go dark when a chase ends) and prefer `channelId` live embeds for regular chasers; only autoplay visible/primary iframes to cut CPU with 10+ feeds.
- Keyboard shortcuts for a wall display (cycle primary stream, toggle layers, fullscreen).

## v2 — Hosted (public, read-only)
**Target: Cloudflare** — Pages for the static SPA, one Worker for `/api/*`.

| Concern | Plan |
|---|---|
| Proxy | Worker routes mirror `vite.config.ts` proxy table one-to-one (`/api/nws`, `/api/kiwisdr`, `/api/txdot`). `src/` unchanged (ADR-0005). |
| Upstream protection | Worker caches responses with the Cache API at upstream cadence (NWS 60 s, SPC 120–300 s, cameras 60 s) so N viewers ≈ 1 upstream request. Per-IP rate limits. |
| HTTPS | KiwiSDR stays link-out (HTTP receivers). Audit every `http://` asset for mixed content. |
| Terms gate | **Before going public**: confirm redistribution terms for IEM, OpenMHz, each DOT feed, KiwiSDR directory; drop RainViewer entirely (personal/educational only). Add an `/about` attributions page. |
| Secrets | YouTube Data API key as a Worker secret → live "storm chase" stream discovery, merged with the curated list (supersedes ADR-0009). |
| Observability | Worker logs + per-source health endpoint (`/api/health`) feeding the panel LEDs; alert on sustained upstream failure. |
| Perf | Code-split panels, lazy-load MapLibre, pause off-screen iframes/audio, cap concurrent camera refreshes. |
| CI | GitHub Actions: typecheck, lint, test on PR; Pages preview deploys per branch. |

## v3 — Accounts & personal data
- Auth (Cloudflare Access or a lightweight OAuth provider); D1 for user data.
- Saved AOIs, custom stream lists, chase logs (GPS track + notes), shared "situation rooms" via link.
- Push/web notifications for new warnings in a saved AOI (Worker cron + Web Push).
- PWA install for mobile in-vehicle use; optional geolocation AOI ("follow me").

## v4 — Licensed / partner data
Each needs an agreement or paid licence; evaluate once there are users:
- Spotter Network live chaser positions.
- Lightning (Blitzortung terms, or a commercial feed).
- Broadcastify scanner audio (paid API/embed licence) — supersedes ADR-0006.
- Higher-res radar (single-site Level II/III, velocity/CC for debris signatures).
- mPING crowd reports.

## Open questions
- Is a public deployment monetised? (Affects RainViewer-like "personal use" sources and partner licences.)
- Region expansion beyond the US (would replace NWS/SPC/NEXRAD with per-country sources — new adapter set, same contract).
