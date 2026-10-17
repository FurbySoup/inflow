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
npm run build:ui     # UI kit library (src/ui → dist/ui, ES + .d.ts), the input to the Claude Design sync
```
Merge gate for any change: `npm run typecheck && npm run lint && npm test && npm run build:ui`. `build:ui` catches kit files importing app code (`src/ui` must stay self-contained).
In the desktop app, `.claude/launch.json` defines the `dev` server for live checks in the browser pane.

## Architecture (read the ADRs in `docs/adr/` before structural changes)
- **Data flow:** upstream → `SourceAdapter` (`src/sources/<source>/`, `fetch` + pure `normalize`) → shared types (`src/types/index.ts`) → `useSource(adapter)` (TanStack Query polling at `adapter.refreshMs`) → panel. Panels never call `fetch`. Reference adapter: `src/sources/nws/alerts.ts`.
- **One cross-panel state:** `useAoi` (`src/state/aoi.ts`) — map writes bbox + derived state codes on `moveend`; every panel filters by it. Panels never import each other. Default AOI is the Plains (TX–NE), evergreen by design.
- **Map overlays** are `MapLayer` modules in `src/map/` registered in `src/map/layers.ts` (array order = draw order). Don't add layers inside `MapPanel.tsx`; NWS alerts are drawn there, always on top.
- **Proxy:** sources without CORS or needing a User-Agent go through same-origin `/api/<source>` paths in `vite.config.ts` (later a Cloudflare Worker with identical routes). Adapters must use the `/api/…` path, not the upstream host. OpenMHz must be fetched directly from the browser (Cloudflare blocks server-side).
- **UI kit (`src/ui/`):** presentational primitives with no data or app state: `Panel`, `StatusLed`, `Badge`, `ConsoleButton`, `AlertList`/`AlertRow`, `StreamTile`, `CameraTile`, `Toast`, `Abbr`/`TaggedText` (+ `glossary.ts`).
  - **Tokens and classes:** all tokens and component classes live in `src/ui/styles.css`. `src/index.css` imports it and holds only the app layout (grid, splitters, map).
  - **Styling rules:** no hardcoded colours except MapLibre paint values. Data values use `--font-data`.
  - **App wiring:** `src/panels/` composes the kit with data. `src/panels/Panel.tsx` is a thin wrapper that binds collapse state to the layout store. Status comes from `queryStatus()` (`src/lib/feedStatus.ts`).
- **Layout state:** `useLayout` (`src/state/layout.ts`, ADR-0011) holds feed/console sizes, console split, collapsed panel codes and the DEFAULT/WALL/CHASE presets. It persists to localStorage (`storm-chasers.layout.v2`).
- **Responsive (ADR-0014):** tiers live in `src/index.css`:
  - desktop;
  - mid-width (≤ 1280);
  - narrow (≤ 900, stacked);
  - short landscape (height ≤ 500);
  - wall (≥ 2560).

  Touch targets are under `pointer: coarse` in the kit. Check UI changes at the viewport matrix in `docs/work-plan.md`. No fixed widths in panels.
- **Interaction (ADR-0012, Norman):**
  - Every interactive element needs a persistent signifier, plus hover, `:focus-visible` and visible feedback.
  - Read-only elements must not look clickable.
  - Examples: the ⌖ glyph on focusable alert rows, the splitter grips, the solid-accent pressed buttons.
- **Acronyms (ADR-0018):** every static on-screen acronym uses `<Abbr term>` (DOM code: `abbr` class + `title` from `expand()`), and every new term gets a `src/ui/glossary.ts` entry in the same change. `? HELP` lists the glossary and chaser terms.
- **Notifications (ADR-0019):** sources emit to `src/state/notify.ts`; only `src/notify/` delivers. Never call the Notification API elsewhere.
- **Claude Design:** the kit is synced to the "Storm Chasers UI" project. Config, previews and conventions live in `.design-sync/`. Re-sync steps are in `.design-sync/NOTES.md`. After changing `src/ui/`, re-sync so designs stay on-brand.

## Data-source gotchas (verified; full table in ADR-0004)
- NWS watches have `geometry: null` — filter them by state from `geocode.UGC`.
- SPC `today.csv` is three CSV sections with their own header lines in one file.
- YouTube embeds break (Error 153) with `referrerpolicy="no-referrer"`.
- KiwiSDR receivers are plain HTTP → link-out only, never iframe.
- RainViewer is personal/educational-only and capped at z7 — not used; IEM is the radar source.
- No Broadcastify (paid licence). No API keys anywhere in v1.
- CARS (KS/NE cameras) needs zoom ≥ 9 or it returns clusters; TxDOT snapshots are base64 JPEG in JSON (fetched only for on-screen tiles).
- The desktop browser pane runs `requestAnimationFrame` at 0/s when unfocused: a black MapLibre map there is the environment, not a bug (inspect via dev-only `window.__map`).

## Parallel work (ADR-0010)
Features are specified as self-contained work packages in `docs/packages/`, scheduled in waves in `docs/work-plan.md`. Waves 1–10 (WP-01…44) are merged.
- **Agents:** packages are built by the `wp-builder` agent (Haiku, one per package, `isolation: "worktree"`) and checked by `wp-verifier`. Both are custom agent types in `.claude/agents/`.
- **Shared files:** `src/types/index.ts`, `src/state/*`, `src/lib/*`, `src/ui/*`, `src/index.css`, `vite.config.ts` and `package.json` are changed only by the orchestrating session. Builders report needed changes instead.
- **Wave hygiene:**
  - Push `main` before launching a wave (worktrees branch from `origin/main`).
  - Builders must not start dev servers or use the browser pane.
  - Merge only after a verifier PASS.
  - Run checks with `set -o pipefail`.
- **Next steps:** start from `docs/next-session.md` (handoff and a paste-in prompt for Wave 11). The 1.0 release plan is `docs/launch-plan.md` (ship 2026-10-30, self-run per ADR-0020). The schedule is in `docs/work-plan.md`; optional hosting later is in `docs/roadmap.md`.

## Adding things
- New source: folder in `src/sources/`, adapter + trimmed real-response fixture + `normalize` test. Add a proxy route only if CORS/headers require it. Verify CORS for the *actual* request (JSON POSTs preflight; CARS failed that).
- New visual primitive: add it to `src/ui/` (export from `src/ui/index.ts`, classes in `src/ui/styles.css`, a JSDoc that states its affordance/signifier/feedback) plus a `.design-sync/previews/<Name>.tsx`, then re-sync.
- New chaser stream: entry in `config/streams.json` (`channelId` for "whatever is live", `videoId` to pin a broadcast). Never guess IDs.
- Roster chaser: `config/chasers.json` is orchestrator-owned. Only add a channel after confirming its ID on the channel's own `/streams` page.
- New decision that changes the above: add an ADR rather than editing an accepted one.
