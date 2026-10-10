# 0008. Map layer registry
Status: Accepted
Date: 2026-10-10

## Context
Several parallel work packages draw on the map (satellite, SPC outlook, storm reports, cameras). If each edits `MapPanel.tsx` they conflict.

## Decision
- A map overlay is a `MapLayer` module in `src/map/` exporting `{ id, label, add(map), refreshMs?, refresh?(map) }`.
- `src/map/layers.ts` holds the ordered `mapLayers` array (draw order, bottom first). Adding a layer = new file + one line in that array.
- `MapPanel` iterates the registry; NWS alerts are always drawn last (on top).
- Layers needing live data own a small hook-free fetch or receive data via `setData` from a panel-level effect; prefer static tile layers where possible.

## Consequences
- Parallel packages only collide on the one-line array edit — trivial merges.
- A layer toggle UI (WP-09) can be built generically from `mapLayers` (`id`, `label`) using `map.setLayoutProperty(id, 'visibility', …)`. Layers must therefore use their `id` as the MapLibre layer id (or a prefix of it).
