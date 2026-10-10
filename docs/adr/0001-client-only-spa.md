# 0001. Client-only Vite + React + TypeScript SPA
Status: Accepted
Date: 2026-10-10

## Context
v1 is a local-only prototype: one screen combining live public storm data. No accounts, no server-side storage. It must be fast to iterate on and easy to host statically later.

## Decision
- Vite + React 19 + TypeScript (strict), run via `npm run dev`.
- MapLibre GL JS for the map (no API key), OpenFreeMap dark basemap.
- TanStack Query for polling/caching each source; Zustand for the one piece of shared state (ADR-0003).
- Vitest + jsdom for tests.
- No backend. Anything persisted in v1 lives in `localStorage` (e.g. layer toggles).

## Consequences
- Static build output (`dist/`) can be hosted on any CDN later (see `docs/roadmap.md`).
- Upstreams that block CORS or require custom headers need a proxy (ADR-0005).
- No secrets can be used in v1 — every v1 source must be keyless.
