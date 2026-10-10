# v1 Work Plan — parallel build

How the remaining v1 features get built concurrently by Haiku sub-agents. Process rules: [ADR-0010](adr/0010-parallel-subagent-factory.md).

## Already built (foundation, orchestrator)
Basic resizing (feeds column + console row splitters, ADR-0011), shared types, adapter contract, AOI store, `useSource`, `<Panel>` chrome + tokens, map layer registry, NWS alerts (map + list), IEM radar, curated streams, dev proxy for NWS.

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

1. Ensure `main` is green: `npm run typecheck && npm run lint && npm test`.
2. Launch one `wp-builder` per package **in a single message** so they run concurrently, each with `isolation: "worktree"`. Prompt: `Build docs/packages/WP-NN-*.md`.
3. As each returns, launch a `wp-verifier` on its branch. FAIL → resume the builder (SendMessage) with the verifier's findings.
4. Merge PASS branches into `main` one at a time; resolve registry one-liners; re-run checks after each merge.
5. Run the app (`.claude/launch.json` → `dev`) and check every panel against live data for the current AOI.
6. Apply any "requested shared changes" builders reported, then start the next wave.

Builders that need a shared-file change (types, store, tokens, package.json) **stop and report** it; they do not make it.
