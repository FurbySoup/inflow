# 0016. Nationwide AOI states from simplified Census shapes
Status: Accepted
Date: 2026-10-11
Amends: 0003 (how `states` is derived, and its consequence that `STATE_BBOXES` must be extended by hand).

## Context
`statesInBbox` used a hand-written table of 20 state bounding boxes. Over IL, OH, MN, PA, the West or New England the AOI got `states = []`, so the alerts list, cameras and scanner went blank. Bounding boxes also over-match: a corner of Kansas picked up Colorado and Oklahoma.

## Decision
- `src/lib/stateShapes.json` holds one simplified outer ring per land polygon for the 50 states, DC and PR (52 codes, about 4,150 vertices, 72 KB).
  - It was generated offline from us-atlas@3.0.1 `states-10m.json` (ISC licence; US Census cartographic boundaries) by `scripts/gen-state-shapes.cjs`.
  - Settings: Douglas-Peucker at 0.05° (about 5 km), and polygons under 0.002 square degrees are dropped. Holes are ignored.
  - The script and its source URL are committed; the source file is not.
- `statesInBbox(bbox)` returns the codes whose rings share area with the bbox, nearest first (by distance from the AOI centre to the centre of each state's largest ring; added at the Wave 8 live check, so the 6-code top-bar label leads with the states in view). It pre-filters by each ring's bbox, then tests a vertex inside, the bbox centre inside, or an edge crossing.
- `stateAt(lng, lat)` gives the state containing a point. Multi-state sources (e.g. New England 511) use it to tag items.
- The geometry helpers live in `src/lib/geo.ts` (`bboxIntersectsGeometry` for Polygon/MultiPolygon). Alert AOI matching and SPC risk lookups reuse them.
- The top bar shows at most 6 codes and then `+N`.

## Consequences
- Every US AOI resolves to states, so panels that filter by state work everywhere.
- Simplification means a point within about 5 km of a border can be placed in the neighbour. That's fine for AOI filtering, but it's not a geocoder.
- Territories other than PR (VI, GU, AS, MP) are out: NWS covers them, but nothing else in v1 does.
- To change the tolerance, re-run the script; the test pins the code count and a few known AOIs.
