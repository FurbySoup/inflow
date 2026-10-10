# WP-09 — Layer toggle control
Wave 2 · Depends on Wave 1 merged · ADRs: 0007, 0008

## Goal
A console-styled MapLibre control listing every registered `MapLayer` with a toggle LED, plus the NWS alerts overlay.

## Owns
`src/map/LayerControl.ts`.
Registry edit allowed: one line in `MapPanel.tsx` inside the `load` handler: `m.addControl(new LayerControl(mapLayers), 'top-left')`.

## Build
- Implements `maplibregl.IControl`; rows built from `mapLayers` (`label`) plus a fixed `NWS Alerts` row (`alerts-fill`, `alerts-line`).
- Toggling sets `visibility` on every style layer whose id starts with the MapLayer `id` (`map.getStyle().layers`).
- Persist visibility per id in `localStorage` (try/catch); apply on load.
- Visual: `--panel` background, `--font-data` labels uppercase, LED reuses `.led .led-live` / `.led-offline` classes.

## Acceptance
- [ ] Every Wave 1 layer toggles independently; state survives reload.
- [ ] Test for prefix-matching helper.
- [ ] Checks pass.
