# WP-12 — Watch outlines (zone-based alerts on the map)
Wave 4 · Depends on orchestrator prep P2 (`Alert.zones`) and pre-wave gate V1 · ADRs: 0002, 0004, 0008, 0012

## Goal
Zone-based alerts (`geometry: null`, e.g. Tornado Watches) draw on the map as dashed outlines of their affected zones, so a watch is visible without reading the list.

## Owns
`src/sources/nwsZones/**` (fetch + pure normalize + IndexedDB cache + fixtures + tests), `src/map/watchOutlines.ts`.
Registry edits allowed:
- `src/map/layers.ts`: append `watchOutlinesLayer` (draw order: above radar, below storm reports).
- `src/panels/MapPanel.tsx`: one line in the existing alerts `useEffect`, `setWatchAlerts(map.current, alerts)`.

## Forbidden
Everything else. No new npm dependency: use the raw IndexedDB API with an in-memory fallback.

## Verified facts
- After prep P2, `Alert.zones` holds the alert's UGC codes, e.g. `GAZ033` or `GAC121`. The 3rd character `Z` is a forecast zone (`/zones/forecast/<code>`) and `C` is a county (`/zones/county/<code>`).
- NWS requests go through the existing `/api/nws` dev proxy, which adds the User-Agent. No new proxy route.
- **Gate V1 (orchestrator, before launch, from an allowed network):** curl `https://api.weather.gov/zones/county/GAC121` and `/zones/forecast/GAZ033` with a User-Agent. Record the response size, `geometry` presence, `Cache-Control`, and whether `?effectiveDate` or a bulk endpoint exists. Commit the two trimmed responses as fixtures in `src/sources/nwsZones/fixtures/` **before** launching the builder. Until then: UNVERIFIED (blocked from the 2026-10-10 planning sandbox).

## Build
- `zoneUrl(ugc)` (pure) and `normalizeZone(raw)` → `{ id, geometry }` (pure, tested against the fixtures).
- `getZoneShapes(codes, signal)`:
  1. Read IndexedDB `storm-chasers.zones`, keyed by code with a 7-day TTL.
  2. Fetch the misses with ≤4 concurrent requests, and write them back.
  3. Fail soft: skip any zone that fails.
- Layer `watch-outlines`: `line` with `line-dasharray`, coloured by event (Tornado Watch / Severe Thunderstorm Watch, MapLibre paint values only). Only alerts with `geometry === null` and an AOI-intersecting `states`. Dedupe codes across alerts.
- `id` prefix `watch-outlines` for every style layer, so the WP-09 LayerControl toggles it.

## Acceptance
- [ ] Unit tests: `zoneUrl` for Z/C codes; `normalizeZone` against both fixtures; the cache TTL logic, with the clock injected.
- [ ] Live (orchestrator): during an active watch the dashed outline matches the SPC watch county list; the layer toggles in the switchboard; a reload serves the shapes from IndexedDB (no network in DevTools).
- [ ] Checks pass.
