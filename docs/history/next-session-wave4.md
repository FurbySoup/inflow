> **Superseded** by `docs/next-session-wave8.md` (Waves 4–7 are merged).

# Next session: plan Wave 4

Handoff from the 2026-10-10 session. Waves 1–3 (WP-01…10), the UI kit (`src/ui/`) and the Claude Design sync are done and pushed. This session's job is to **plan** Wave 4, not build it: research, write the work packages, update the work plan, then hand back for approval before launching builders.

## Paste this to start the session

> Plan Wave 4 for Storm Chasers. Read `CLAUDE.md`, `docs/next-session-wave4.md`, `docs/work-plan.md`, `docs/roadmap.md` (v1.1) and ADRs 0002, 0004, 0008, 0010, 0011, 0012.
> 1. **Research first.** Run one background research agent that curl-verifies endpoints, CORS for the real request method, keys and terms for every candidate source below. Record UNVERIFIED where unsure.
> 2. **Write the packages.** Write `docs/packages/WP-11…` in the existing format: goal, Owns, Forbidden, Registry edits allowed, Verified facts, Build, Acceptance.
> 3. **Schedule the waves.** Group packages into waves with no file overlap, and list any orchestrator prep (shared-file changes) needed before each wave.
> 4. **Record the plan.** Update `docs/work-plan.md` and the roadmap, and add an ADR if a decision changes (e.g. a YouTube live-check proxy).
> 5. **Stop and show me the plan** (packages, waves, agent count) before launching anything.

## Candidate scope (from roadmap v1.1, roughly by value)

| # | Candidate | Notes / open questions for research |
|---|---|---|
| A | **GA cameras** (511GA / GDOT) | The live-proofing storm area has no cameras. Find a keyless camera-list endpoint with lat/lon plus snapshot URLs, and check CORS for the real request. Adds to `CAMERA_ADAPTERS` and the empty-state text. |
| B | **SC cameras** (SC511 / SCDOT) | Same as A. Check whether it's a CARS deployment like KS/NE; then `carsAdapter` gets reused with a new endpoint. |
| C | **FL / AL cameras** (FL511, ALGO Traffic) | Lower priority. Possibly defer to Wave 5. |
| D | **Stream lifecycle** | Pinned `videoId`s go dark when a broadcast ends. Options: live check via the watch page's `isLiveNow` through a dev proxy (`/api/youtube`), or oEmbed plus a staleness date in `config/streams.json`. Also autoplay only the primary and visible feeds. Needs an ADR (supersedes part of 0009). |
| E | **Watch outlines** | Zone-based alerts (`geometry: null`) list `affectedZones` URLs. Fetch zone shapes from `api.weather.gov/zones/...`, cache them (IndexedDB), and draw a dashed map layer via the layer registry. Check the zone endpoint's size and rate limits. |
| F | **SPC mesoscale discussions + watch boxes** | Find GeoJSON or polygon sources (SPC or IEM). Map layer via the registry. |
| G | **AOI presets** (Plains / Dixie Alley / Southeast) | Top-bar control that moves the map. Needs a shared-store prep (e.g. an `aoiRequest` the map consumes). That prep is orchestrator work done before the wave. |
| H | **Wall-display keyboard shortcuts** | Cycle the primary stream, toggle layers, apply presets, fullscreen. Touches several panels, so schedule it after G. |
| I | **Tech debt** (orchestrator or one small WP) | ConsoleSplitter: clear `body.resizing` on unmount mid-drag and handle `lostpointercapture`. Throttle layout `localStorage` writes during a drag. Move the AudioPanel's inline-styled buttons to `ConsoleButton` (kit adoption). |

Not in Wave 4: hosting (v2, gated on a terms review), accounts, and licensed data (v4).

## Planning constraints learned so far
- **Push `main` before launching a wave.** Worktrees branch from `origin/main`; an unpushed main gave Wave 2 a stale base.
- **Launch builders and verifiers as the custom agent types** `wp-builder` / `wp-verifier` (Haiku, `isolation: "worktree"` for builders). Tell builders:
  - no dev servers or browser tools;
  - use Write/Edit, not heredocs (Git Bash mangles template literals);
  - `npm ci` first.
- **Registry one-liners** (`CAMERA_ADAPTERS` in `src/panels/CamerasPanel.tsx`, `mapLayers` in `src/map/layers.ts`, `vite.config.ts` proxy entries) are allowed builder edits; the orchestrator resolves the merge conflicts. Several camera packages in one wave will conflict on the same array, which is fine and trivial to resolve.
- **Shared files are orchestrator-only:** `src/types`, `src/state/*`, `src/lib/*`, `src/ui/*`, `src/index.css`, `vite.config.ts` (except listed proxy entries), `package.json`. A new UI primitive goes into `src/ui/` via the orchestrator, followed by a Claude Design re-sync.
- **Package acceptance must include live-check steps.** The orchestrator runs them (e.g. "pan to Atlanta → GA snapshots"). Builders can't use the browser.
- **Verify CORS with the real method.** CARS returned `Access-Control-Allow-Origin: *` for GET but failed the JSON POST preflight. And `normalize` must be pure (WP-01 failed on clock reads).
- **ADR-0012 applies to every new interactive element:** persistent signifier, hover, `:focus-visible`, feedback.
- **Wave size:** recent waves ran 3–6 builders plus one verifier each, with about 1–2 fix rounds.

## Parallel track (not Wave 4)
- **Claude Design redesign.** The user is running `docs/design/claude-design-prompt.md` in Claude Design. When the colour system and brand come back:
  - implement them as token swaps in `src/ui/styles.css` (keep the variable names, or follow its mapping table);
  - check contrast and colour-blind safety on top of radar;
  - re-sync via `.design-sync/NOTES.md`.
- If brand fonts are chosen, add them via `extraFonts` and remove the "system fonts by decision" note.
