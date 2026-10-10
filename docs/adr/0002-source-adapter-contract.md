# 0002. Source adapter contract and shared types
Status: Accepted
Date: 2026-10-10

## Context
v1 pulls from ~8 heterogeneous upstreams (GeoJSON, CSV, GraphQL, base64-in-JSON, JS arrays). Work is built in parallel by sub-agents, so adding a source must not require touching UI code or other sources.

## Decision
- Shared domain types live in `src/types/index.ts`: `Alert`, `LiveStream`, `AudioFeed`, `CameraFeed`, `StormReport`, `Bbox`, `LngLat`.
- Every upstream is a `SourceAdapter<Raw, Item>` (`src/sources/types.ts`) in `src/sources/<source>/`:
  - `fetch(aoi, signal)` — network only, returns raw upstream shape.
  - `normalize(raw)` — **pure**, raw → shared type. All parsing quirks live here.
  - `refreshMs` — poll cadence, matched to upstream cache headers.
- Panels consume adapters only through `useSource(adapter)` (`src/lib/useSource.ts`), never `fetch` directly.
- Each adapter ships a colocated `*.test.ts` that runs `normalize` against a recorded fixture (trimmed real response in `src/sources/<source>/fixtures/`).

## Consequences
- New sources are additive: one folder + one test. Changes to shared types are the only cross-cutting edits and are reserved for the orchestrator (ADR-0010).
- Upstream format changes break one adapter test, not the UI.
- Static sources (curated JSON config) skip `fetch` and expose a normalized constant instead (see `src/sources/streams/curated.ts`).
