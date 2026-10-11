# WP-21 — Top-bar threat button + "WARNINGS HIDDEN" chip
Wave 7 · Depends on prep P7a · ADRs: 0003, 0012, 0014, **0015** · Spec: HANDOFF.md §5 ("the top-bar threat button keeps the most severe warning visible at all times"), §9 items 2 + 9; `Console.dc.html` ~lines 23-40 (markup), 484-487 (rules)

## Goal
The single most important thing on screen must never scroll away. The top bar always shows tornado-warning status for the AOI, and one press focuses the most severe one.

## Owns
`src/panels/ThreatButton.tsx`, `src/panels/threat.ts` (pure helpers) + `threat.test.ts`, `src/panels/Topbar.tsx`.
Registry edit allowed: `src/map/LayerControl.ts`, to add exported `isLayerOn(id): boolean` and `subscribeLayers(listener): () => void`. Notify on every toggle, mirroring `toggleLayer`/`layerIds`.

## Forbidden
`src/ui/*` (compose with `ConsoleButton` and `Badge`), `src/state/*`, alert panel files.

## Build
- **ThreatButton**, rendered in the top bar after the AOI readout:
  - With tornado warnings in the AOI (same state filter as AlertsList: `a.states ∩ aoi.states`):
    - label `▼ N TORNADO WARNING(S)` plus `· N PDS` when any `isPds`, plus `NEXT EXP T-mm:ss` (soonest TOR expiry);
    - hazard-red block, `--hz-tor-ink` text;
    - press → `useAoi.setFocus` on `mostSevereTornado(...)` with its polygon bbox (use `geometryBbox` from `src/panels/alertGeometry.ts`, read-only import);
    - `⌖` signifier, `aria-label` "Focus most severe tornado warning".
  - None: a quiet, read-only `NO TORNADO WARNINGS` that does not look clickable (ADR-0012).
  - Fetch alerts with the existing `nwsAlerts` adapter via `useSource` (TanStack de-dupes with the alerts panel's query; same key).
- **WARNINGS HIDDEN chip:** when the `alerts` layer is off (`isLayerOn('alerts') === false`), show a sand chip `WARNINGS HIDDEN` that toggles it back on when pressed (`toggleLayer('alerts')`), so the control signifies.
- Pure helpers in `threat.ts`: `threatSummary(alerts, aoiStates, now)` → `{ count, pdsCount, nextExpiryMs, target }`.

## Responsive (ADR-0014)
- Fits the top-bar tiers. At ≤900 px it shows `▼ N TOR` plus the countdown. On touch it meets `--hit-min`.

## Acceptance
- [ ] Tests for `threatSummary`: none / one / several with PDS, AOI filter, soonest expiry.
- [ ] Orchestrator live check: with active TOR in the AOI the button focuses the map; toggling NWS Alerts off shows the chip, and the chip restores it.
- [ ] `npm run typecheck && npm run lint && npm test` pass.
