# 0005. Dev proxy now, edge proxy when hosted
Status: Accepted
Date: 2026-10-10

## Context
Some upstreams lack CORS (TxDOT, KiwiSDR directory) or want headers browsers cannot set (NWS User-Agent). v1 is local-only.

## Decision
- All non-CORS or header-requiring upstreams are reached via same-origin paths `/api/<source>/…`, configured in `vite.config.ts` `server.proxy`.
- Adapters only ever use the `/api/<source>` path for these sources, never the upstream host, so hosting changes nothing in `src/`.
- CORS-open sources (IEM tiles, SPC, CARS GraphQL, OpenMHz) are fetched directly. OpenMHz must stay direct-from-browser: Cloudflare challenges server-side fetches.
- When hosted, each proxy entry becomes a route in a Cloudflare Worker with the same path prefix (see `docs/roadmap.md`).

## Consequences
- `vite preview` / static builds have no proxy: proxied sources fail there in v1. Acceptable for a local prototype.
- The proxy route table in `vite.config.ts` is a shared file; new routes are added by the orchestrator or merged as one-line additions.
