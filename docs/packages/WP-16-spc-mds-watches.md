# WP-16 — SPC mesoscale discussions + watch boxes
Wave 4 **only if gate V4 passes**, else Wave 5 · ADRs: 0002, 0004, 0008, 0012

## Goal
Active SPC mesoscale discussions (MDs) and watch parallelograms as map layers, each with the MD/watch number. Clicking one opens its SPC page.

## Owns
`src/sources/spcProducts/**` (adapter, pure normalize, fixtures, tests), `src/map/spcMds.ts`, `src/map/spcWatches.ts`.
Registry edits allowed:
- `src/map/layers.ts`: append both layers, above `spcOutlookLayer` and below `radarLayer`;
- one proxy entry in `vite.config.ts` if gate V4 finds no CORS.

## Forbidden
Everything else. Don't touch `src/sources/spc/**` (WP-01's outlook and reports).

## Verified facts
- **Gate V4 (orchestrator, from an allowed network, before launch).** All of this is UNVERIFIED as of 2026-10-10 (SPC and IEM blocked from the planning sandbox).
  1. Find a keyless GeoJSON (or polygon) source for **active** MDs and watches. Candidates: IEM `mesonet.agron.iastate.edu/geojson/…` endpoints, and SPC's own products. IEM's `json/spcwatch.py` is a point/time query, not a national layer.
  2. Check CORS for the real request.
  3. Record the refresh cadence and properties (number, type, expiry, product URL).
  4. Commit trimmed responses as fixtures. If no polygon source exists, defer this package.
- Known: SPC's Day 1 outlook GeoJSON already loads with `*` CORS (ADR-0004).

## Build
- Two `MapLayer`s with id prefixes `spc-mds` and `spc-watches`. Each fetches on `refreshMs` (120 s) and does `setData` (hook-free, per ADR-0008).
- MDs: dashed outline plus a `MD 1234` symbol label. Watches: solid outline coloured by type, with a `WW 567` label. MapLibre paint values only.
- Click → `window.open(productUrl, '_blank', 'noopener')`; pointer cursor on hover (ADR-0012 signifier).

## Acceptance
- [ ] Normalize tests against the fixtures (MD + tornado watch + severe watch).
- [ ] Live (orchestrator): active MDs/watches match spc.noaa.gov; both toggle in the switchboard; a click opens the product.
- [ ] Checks pass.
