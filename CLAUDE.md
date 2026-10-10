# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is
Storm Chasers: a single-screen, mission-control style dashboard combining live US storm data — NEXRAD radar, NWS alerts, chaser livestreams, scanner/ham/CB audio, DOT traffic cameras, SPC outlooks, GOES satellite. v1 is a **local-only, client-only, keyless** prototype (Vite + React + TS). Repo: https://github.com/FurbySoup/storm-chasers

## Commands
```bash
npm run dev          # http://localhost:5173 (dev proxy for /api/* is active only here)
npm run typecheck    # tsc -b
npm run lint         # eslint
npm test             # vitest run (all)
npx vitest run src/sources/nws/alerts.test.ts   # single file
npx vitest run -t "derives states"              # single test by name
npm run build        # typecheck + production build to dist/
```
Merge gate for any change: `npm run typecheck && npm run lint && npm test`.
In the desktop app, `.claude/launch.json` defines the `dev` server for live checks in the browser pane.

## Architecture (read the ADRs in `docs/adr/` before structural changes)
- **Data flow:** upstream → `SourceAdapter` (`src/sources/<source>/`, `fetch` + pure `normalize`) → shared types (`src/types/index.ts`) → `useSource(adapter)` (TanStack Query polling at `adapter.refreshMs`) → panel. Panels never call `fetch`. Reference adapter: `src/sources/nws/alerts.ts`.
- **One cross-panel state:** `useAoi` (`src/state/aoi.ts`) — map writes bbox + derived state codes on `moveend`; every panel filters by it. Panels never import each other. Default AOI is GA/SC (live-proofing storm 2026-10-10).
- **Map overlays** are `MapLayer` modules in `src/map/` registered in `src/map/layers.ts` (array order = draw order). Don't add layers inside `MapPanel.tsx`; NWS alerts are drawn there, always on top.
- **Proxy:** sources without CORS or needing a User-Agent go through same-origin `/api/<source>` paths in `vite.config.ts` (later a Cloudflare Worker with identical routes). Adapters must use the `/api/…` path, not the upstream host. OpenMHz must be fetched directly from the browser (Cloudflare blocks server-side).
- **UI:** every panel renders in `<Panel code title status>` (`src/panels/Panel.tsx`) with status from `queryStatus()` (`src/lib/feedStatus.ts`). All colors/fonts are tokens in `src/index.css` — no hardcoded colors except MapLibre paint values. Data values use `--font-data` monospace.

## Data-source gotchas (verified; full table in ADR-0004)
- NWS watches have `geometry: null` — filter them by state from `geocode.UGC`.
- SPC `today.csv` is three CSV sections with their own header lines in one file.
- YouTube embeds break (Error 153) with `referrerpolicy="no-referrer"`.
- KiwiSDR receivers are plain HTTP → link-out only, never iframe.
- RainViewer is personal/educational-only and capped at z7 — not used; IEM is the radar source.
- No Broadcastify (paid licence). No API keys anywhere in v1.

## Parallel work (ADR-0010)
Remaining v1 features are specified as self-contained work packages in `docs/packages/`, scheduled in waves in `docs/work-plan.md`. They're built by the `wp-builder` agent (Haiku, one per package, `isolation: "worktree"`) and checked by `wp-verifier`. Shared files (`src/types/index.ts`, `src/state/aoi.ts`, `src/lib/*`, `src/panels/Panel.tsx`, `src/index.css`, `vite.config.ts`, `package.json`) are changed only by the orchestrating session; builders report needed changes instead. Post-v1 hosting plan: `docs/roadmap.md`.

## Adding things
- New source: folder in `src/sources/`, adapter + trimmed real-response fixture + `normalize` test. Add a proxy route only if CORS/headers require it.
- New chaser stream: entry in `config/streams.json` (`channelId` for "whatever is live", `videoId` to pin a broadcast). Never guess IDs.
- New decision that changes the above: add an ADR rather than editing an accepted one.
