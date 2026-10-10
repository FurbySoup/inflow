# v1 Work Plan — parallel build

How the remaining v1 features get built concurrently by Haiku sub-agents. Process rules: [ADR-0010](adr/0010-parallel-subagent-factory.md).

## Already built (foundation, orchestrator)
Basic resizing (feeds column + console row splitters, ADR-0011), shared types, adapter contract, AOI store, `useSource`, `<Panel>` chrome + tokens, map layer registry, NWS alerts (map + list), IEM radar, curated streams, dev proxy for NWS.

## Status
- Wave 1 (WP-01, 02, 03, 05, 06, 07): **merged** 2026-10-10. Verifier caught: impure SPC normalize, CARS preflight CORS (proxied).
- Wave 2 (WP-04, 08, 09): **merged** 2026-10-10. Verifier caught: stale focus, eager off-screen TxDOT fetches.
- Wave 3 (WP-10): **merged** 2026-10-10. Orchestrator follow-up: collapsible wired on all panels; collapsed headers compacted.
- Wave 4 (WP-11…16): **planned** 2026-10-10, awaiting approval. See "Wave 4" below.

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
| [11](packages/WP-11-aoi-presets.md) | AOI presets | 4 | `src/panels/AoiPresets.tsx` (+test) | `Topbar.tsx` one line |
| [12](packages/WP-12-watch-outlines.md) | Watch outlines | 4 (V1) | `src/sources/nwsZones/**`, `src/map/watchOutlines.ts` | `layers.ts`, `MapPanel.tsx` one line |
| [13](packages/WP-13-stream-lifecycle.md) | Stream lifecycle | 4 | `src/sources/streams/**`, `src/panels/StreamsGrid.tsx` | `config/streams.json` (`until`) |
| [14](packages/WP-14-cameras-sc.md) | SC cameras | 4 (V2) | `src/sources/sc511/**` | `CamerasPanel.tsx` adapter list + empty text, `vite.config.ts` proxy |
| [15](packages/WP-15-cameras-ga.md) | GA cameras | 4 (V3) | `src/sources/ga511/**` | `CamerasPanel.tsx` adapter list + empty text, `vite.config.ts` proxy |
| [16](packages/WP-16-spc-mds-watches.md) | SPC MDs + watch boxes | 4 (V4) | `src/sources/spcProducts/**`, `src/map/spcMds.ts`, `src/map/spcWatches.ts` | `layers.ts`, `vite.config.ts` proxy |
| [17](packages/WP-17-wall-shortcuts.md) | Wall shortcuts | 5 | `src/panels/Shortcuts.tsx`, `src/panels/shortcuts.ts` | `App.tsx`, `StreamsGrid.tsx`, `LayerControl.ts` |

## Wave 4 (planned 2026-10-10)

Endpoint research ran from a sandbox whose egress blocked every upstream host, so no new source is curl-verified yet. Packages that need a new endpoint carry a **pre-wave gate** (V1–V4). The orchestrator runs each gate from an allowed network (the user's machine) and commits the trimmed fixtures before that package launches. A package whose gate fails slips to Wave 5.

### Orchestrator prep (before launch; shared files)
- **P1 `aoiRequest`** (for WP-11):
  - `src/state/aoi.ts` gains `request: Bbox | null`, `requestAoi(bbox)` and `clearRequest()`.
  - `MapPanel.tsx` gets an effect that `fitBounds` the request and then clears it; `moveend` writes the AOI as today.
  - Test in a new `aoi.test.ts`.
- **P2 `Alert.zones`** (for WP-12): `src/types/index.ts` adds `zones: string[]` (UGC codes); `src/sources/nws/alerts.ts` normalize fills it from `geocode.UGC`; update the test.
- **P3 tech debt** (roadmap item I, small, so the orchestrator does it instead of a WP):
  - `Splitter.tsx`: clear `body.resizing` on unmount mid-drag and on `lostpointercapture`.
  - `src/state/layout.ts`: write `localStorage` on drag end, or throttled to ≤4/s, rather than on every move.
  - `AudioPanel.tsx`: replace the inline-styled buttons with `ConsoleButton`.
- **P4** accept ADR-0013 (set its status line to Accepted) once the user approves.
- **Gates V1–V4**, from an allowed network:
  - V1: NWS zone shapes (WP-12);
  - V2: SC511 is CARS? (WP-14);
  - V3: keyless 511GA list (WP-15);
  - V4: SPC MD/watch polygons (WP-16).
- Then green checks and **`git push origin main`**.

```
Prep P1–P4 + gates V1–V4
        ▼
Wave 4 (parallel, no owned-file overlap)
  WP-11 AOI presets          ── Topbar one-liner
  WP-12 Watch outlines       ── map layer + MapPanel one-liner          [V1]
  WP-13 Stream lifecycle     ── streams source + StreamsGrid
  WP-14 SC cameras           ── CAMERA_ADAPTERS + proxy entry           [V2]
  WP-15 GA cameras           ── CAMERA_ADAPTERS + proxy entry           [V3 + key decision]
  WP-16 SPC MDs + watches    ── map layers                               [V4]
        ▼
  Prep P5: command delivery for shortcuts (store vs CustomEvent)
        ▼
Wave 5
  WP-17 Wall shortcuts       ── needs WP-11 + WP-13
  + any gated Wave 4 package that slipped; FL511 / ALGO cameras (unpackaged)
```

**Expected conflicts (trivial, resolved by the orchestrator):**
- `src/map/layers.ts`: WP-12, WP-16.
- `CAMERA_ADAPTERS` / `NO_COVERAGE`: WP-14, WP-15.
- `vite.config.ts` proxy entries: WP-14, WP-15, WP-16.
- `MapPanel.tsx`: P1 prep, then WP-12's one line.

**Agent count:** 3 builders if every gate fails (WP-11/12/13; WP-12 needs V1 at minimum, otherwise 2), up to 6 if all pass. Plus one `wp-verifier` per builder.

## Running a wave (orchestrator)

1. Ensure `main` is green: `npm run typecheck && npm run lint && npm test` — then **`git push origin main`**. Agent worktrees are cut from `origin/main`, not local `main`; an unpushed main gives builders a stale base (happened in Wave 2).
2. Launch one `wp-builder` per package **in a single message** so they run concurrently, each with `isolation: "worktree"`. Prompt: `Build docs/packages/WP-NN-*.md`.
3. As each returns, launch a `wp-verifier` on its branch. FAIL → resume the builder (SendMessage) with the verifier's findings.
4. Merge PASS branches into `main` one at a time; resolve registry one-liners; re-run checks after each merge.
5. Run the app (`.claude/launch.json` → `dev`) and check every panel against live data for the current AOI.
6. Apply any "requested shared changes" builders reported, then start the next wave.

Builders that need a shared-file change (types, store, tokens, package.json) **stop and report** it; they do not make it.
