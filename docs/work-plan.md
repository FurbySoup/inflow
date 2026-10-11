# v1 Work Plan — parallel build

How the remaining v1 features get built concurrently by Haiku sub-agents. Process rules: [ADR-0010](adr/0010-parallel-subagent-factory.md).

## Already built (foundation, orchestrator)
Basic resizing (feeds column + console row splitters, ADR-0011), shared types, adapter contract, AOI store, `useSource`, `<Panel>` chrome + tokens, map layer registry, NWS alerts (map + list), IEM radar, curated streams, dev proxy for NWS.

## Status
- Wave 1 (WP-01, 02, 03, 05, 06, 07): **merged** 2026-10-10. Verifier caught: impure SPC normalize, CARS preflight CORS (proxied).
- Wave 2 (WP-04, 08, 09): **merged** 2026-10-10. Verifier caught: stale focus, eager off-screen TxDOT fetches.
- Wave 3 (WP-10): **merged** 2026-10-10. Orchestrator follow-up: collapsible wired on all panels; collapsed headers compacted.
- Wave 4 (WP-11…16): **merged** 2026-10-11.
  - Verifiers caught: impure SPC normalize (WP-13), an IndexedDB open-failure path that disabled outlines for the session (WP-14), and unguarded 12 h camera-list caching (WP-11).
  - The orchestrator review caught county-only zones dropping every Flood Watch (WP-14).
  - Live checks caught:
    - statements/advisories cluttering the outline layer (now Watch/Warning only);
    - a 10-state AOI table (no LA/MS for DIXIE);
    - PLAINS never pressing on wide maps;
    - the short-landscape top bar hiding controls.
  - Follow-ups:
    - back off when a GA/FL list walk keeps failing;
    - optional `status` slot on `StreamTile`, so ENDED/OFFLINE can sit in the caption (kit change + re-sync).
- Wave 5 (WP-17) is next: do prep P3 first, then confirm the keymap with the user.

## Wave 4 (v1.1 coverage polish)

Sources were curl-verified on 2026-10-10 (endpoints, CORS for the real method, keys). Facts are in each package.

**Orchestrator prep, before launch** (shared files, one commit each, then `git push origin main`). All done 2026-10-11:
- **P0 tech debt (candidate I):**
  - `Splitter.tsx`/`ConsoleSplitter`: clear `body.resizing` on unmount mid-drag and handle `lostpointercapture`.
  - Throttle layout `localStorage` writes during a drag (`src/state/layout.ts`).
  - AudioPanel inline-styled buttons → `ConsoleButton`.
- **P1:** `Alert.zones: string[]` (NWS `affectedZones` URLs) in `src/types/index.ts`, plus the `src/sources/nws/alerts.ts` normalize and its test (for WP-14).
- **P2:** `useAoi` gains `aoiRequest: { bbox, seq } | null`, `requestAoi(bbox)` and `clearAoiRequest()` (for WP-16).
- **P4, responsive tiers (ADR-0014):**
  - viewport-capped tracks, `100dvh`, safe areas;
  - mid-width, short-landscape and wall tiers;
  - touch targets;
  - layer control collapsed by default on small screens.
- ADR-0013 (stream liveness) accepted 2026-10-11.
- After the merge, re-sync Claude Design: P0/P4 changed `src/ui/styles.css` (link-out buttons, touch targets).

```
Prep P0–P2, P4 (orchestrator) → push main
        ▼
Wave 4 (6 builders in parallel, + 1 verifier each)
  WP-11 GA + FL cameras (IBI 511)     ── src/sources/ibi511, proxy /api/511ga + /api/fl511
  WP-12 SC cameras (511SC Iteris)     ── src/sources/sc511,  proxy /api/511sc
  WP-13 SPC MDs + watch boxes (IEM)   ── src/sources/iemspc, 2 map layers
  WP-14 Watch outlines (NWS zones)    ── src/sources/nwszones, 1 map layer, IndexedDB
  WP-15 Stream lifecycle (ADR-0013)   ── src/sources/streams, StreamsGrid, proxy /api/youtube
  WP-16 AOI presets                   ── Topbar control + MapPanel effect
        ▼
Merge: resolve registry one-liners; update CamerasPanel NO_COVERAGE text to "KS · NE · TX · GA · SC · FL"
Prep P3: primary stream → src/state/streams.ts; LayerControl toggle API
        ▼
Wave 5
  WP-17 Wall-display keyboard shortcuts
```

| WP | Title | Wave | Owns (exclusive) | Registry edits allowed |
|---|---|---|---|---|
| [11](packages/WP-11-cameras-ibi511.md) | GA + FL cameras (IBI 511) | 4 | `src/sources/ibi511/**` | `CAMERA_ADAPTERS`, `vite.config.ts` 2 proxy entries |
| [12](packages/WP-12-cameras-sc511.md) | SC cameras (511SC) | 4 | `src/sources/sc511/**` | `CAMERA_ADAPTERS`, `vite.config.ts` proxy entry |
| [13](packages/WP-13-spc-mds-watches.md) | SPC MDs + watch boxes | 4 | `src/sources/iemspc/**`, `src/map/spcMesoscale.ts`, `src/map/spcWatches.ts` | `src/map/layers.ts` |
| [14](packages/WP-14-watch-outlines.md) | Watch outlines | 4 | `src/sources/nwszones/**`, `src/map/watchOutlines.ts` | `src/map/layers.ts` |
| [15](packages/WP-15-stream-lifecycle.md) | Stream lifecycle | 4 | `src/sources/streams/**`, `src/panels/StreamsGrid.tsx`, `config/streams.json` | `vite.config.ts` proxy entry |
| [16](packages/WP-16-aoi-presets.md) | AOI presets | 4 | `src/panels/AoiPresets.tsx`, `src/panels/aoiPresetData.ts` (+test) | `Topbar.tsx` one line, `MapPanel.tsx` one effect |
| [17](packages/WP-17-wall-shortcuts.md) | Wall-display shortcuts | 5 | `src/panels/Shortcuts.tsx`, `src/panels/shortcuts.ts` (+test) | `App.tsx` mount |

**Expected merge conflicts (trivial):**
- `CAMERA_ADAPTERS` (WP-11, WP-12);
- `vite.config.ts` proxy table (WP-11, 12, 15);
- `layers.ts` array (WP-13, 14). Final order: `satellite, spcOutlook, radar, watchOutlines, spcMesoscale, spcWatches, stormReports`.

**Deferred:**
- Alabama ALGO cameras: the Incapsula bot wall blocks every request; we won't work around bot detection.
- Oklahoma cameras: still unverifiable from the UK.
- Terms for 511GA, 511SC and FL511 are UNVERIFIED (no terms pages found). They go on the v2 terms-gate list.

## Waves

```
Wave 1 (parallel, no file overlap)
  WP-01 SPC outlook + storm reports   ── map layers
  WP-02 Radar loop / timeline          ── map layer (radar.ts)
  WP-03 GOES satellite layer           ── map layer
  WP-05 Streams grid UX                ── StreamsGrid
  WP-06 Audio panel (OpenMHz + KiwiSDR)── new panel
  WP-07 DOT cameras KS/NE (CARS)       ── new panel
        │
  Orchestrator merge + prep: add `focus` to AOI store (for WP-04)
        ▼
Wave 2 (parallel)
  WP-04 Alert interaction              ── AlertsList, MapPanel
  WP-08 TxDOT cameras via proxy        ── extends WP-07
  WP-09 Layer toggle control           ── needs Wave 1 layers
        ▼
Wave 3
  WP-10 Layout customization           ── layout store, console split, presets
```

| WP | Title | Wave | Owns (exclusive) | Registry edits allowed |
|---|---|---|---|---|
| [01](packages/WP-01-spc.md) | SPC outlook + storm reports | 1 | `src/sources/spc/**`, `src/map/spcOutlook.ts`, `src/map/stormReports.ts` | `src/map/layers.ts` |
| [02](packages/WP-02-radar-loop.md) | Radar loop / timeline | 1 | `src/map/radar.ts`, `src/map/radarLoop.ts`, `src/sources/radar/**` | — |
| [03](packages/WP-03-satellite.md) | GOES satellite layer | 1 | `src/map/satellite.ts`, `src/sources/satellite/**` | `src/map/layers.ts` |
| [04](packages/WP-04-alert-interaction.md) | Alert interaction | 2 | `src/panels/AlertsList.tsx`, `src/panels/MapPanel.tsx` | — |
| [05](packages/WP-05-streams-ux.md) | Streams grid UX | 1 | `src/panels/StreamsGrid.tsx`, `src/sources/streams/**` | `config/streams.json` (append) |
| [06](packages/WP-06-audio.md) | Audio panel | 1 | `src/sources/openmhz/**`, `src/sources/kiwisdr/**`, `src/panels/AudioPanel.tsx`, `config/audio.json` | `App.tsx` placeholder swap, `vite.config.ts` proxy entry |
| [07](packages/WP-07-cameras-cars.md) | DOT cameras KS/NE | 1 | `src/sources/cars/**`, `src/panels/CamerasPanel.tsx` | `App.tsx` placeholder swap |
| [08](packages/WP-08-cameras-txdot.md) | TxDOT cameras | 2 | `src/sources/txdot/**` | `CamerasPanel.tsx` adapter list, `vite.config.ts` proxy entry |
| [10](packages/WP-10-layout-customization.md) | Layout customization | 3 | `src/state/layout.ts`, `src/panels/Splitter.tsx`, `src/panels/LayoutMenu.tsx` | `App.tsx`, `Topbar.tsx`, `Panel.tsx` (optional prop), layout CSS |
| [09](packages/WP-09-layer-control.md) | Layer toggle control | 2 | `src/map/LayerControl.ts` | `MapPanel.tsx` one line (`addControl`) |

## Running a wave (orchestrator)

1. Ensure `main` is green: `npm run typecheck && npm run lint && npm test` — then **`git push origin main`**. Agent worktrees are cut from `origin/main`, not local `main`; an unpushed main gives builders a stale base (happened in Wave 2).
2. Launch one `wp-builder` per package **in a single message** so they run concurrently, each with `isolation: "worktree"`. Prompt: `Build docs/packages/WP-NN-*.md`.
3. As each returns, launch a `wp-verifier` on its branch. FAIL → resume the builder (SendMessage) with the verifier's findings.
4. Merge PASS branches into `main` one at a time; resolve registry one-liners; re-run checks after each merge.
5. Run the app (`.claude/launch.json` → `dev`) and check every panel against live data for the current AOI.
   Then check the **viewport matrix** (ADR-0014) with the browser pane's `resize_window`: 1920×1080, 1366×768, 1024×768, 768×1024, 390×844, 844×390, 3840×2160. At each size:
   - no horizontal page scroll;
   - the map is visible on the first screen;
   - every control is reachable without hover.
6. Apply any "requested shared changes" builders reported, then start the next wave.

Builders that need a shared-file change (types, store, tokens, package.json) **stop and report** it; they do not make it.
