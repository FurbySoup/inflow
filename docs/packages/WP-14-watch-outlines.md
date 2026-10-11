# WP-14 — Watch outlines (zone shapes for zone-based alerts)
Wave 4 · Depends on orchestrator prep P1 (`Alert.zones`) · ADRs: 0002, 0004, 0008, 0014

## Goal
Zone-based alerts (`geometry: null`, e.g. most watches and flood watches) get drawn on the map as dashed county/zone outlines, coloured like their list severity, so the map no longer hides 9 of GA's 12 alerts.

## Owns
`src/sources/nwszones/**`, `src/map/watchOutlines.ts`.
Registry edit allowed: `src/map/layers.ts`. Add the layer **after** `radarLayer`, below WP-13's watch boxes. The orchestrator resolves the one-line conflict.

## Forbidden
Everything else. Don't touch `MapPanel.tsx` (storm-based alert polygons stay there) or `src/sources/nws/**`.

## Verified facts (2026-10-10, curl)
- Live: GA had 12 active alerts, 9 with `geometry: null`; SC 13, 11 null. Their `properties.affectedZones` are URLs like `https://api.weather.gov/zones/county/GAC029`, `/zones/forecast/GAZ087`, `/zones/fire/GAZ087`.
- Zone GET → 200 `application/geo+json`, `ACAO:*`, **`Cache-Control: max-age≈30 days`**. Sizes: county 40–67 KB raw (4–6 KB gzip), forecast 6–10 KB.
- **An empty User-Agent → 403.** Browsers send one; still route through the existing `/api/nws` proxy (rewrite `https://api.weather.gov` → `/api/nws`) so requests carry the project UA.
- NWS has **no working bulk geometry**: `/zones?id=…&include_geometry=true` returns `geometry: null`.
- Fallback bulk source (only if per-zone proves too slow): IEM `https://mesonet.agron.iastate.edu/api/1/nws/ugcs.geojson?state=GA` → `ACAO:*`, 566 KB, 327 UGCs with geometry.
- NWS rate limits: unpublished (advice: back off ~5 s on 429).

## Build
- After prep P1, `Alert.zones: string[]` holds the `affectedZones` URLs.
- `src/sources/nwszones/`: `zoneUrlToProxy(url)` (pure), `normalizeZone(raw)` (pure → `{ id, geometry }`), and `getZoneShapes(urls, signal)`:
  - IndexedDB cache keyed by zone id with a 30-day TTL (a thin wrapper; no new dependency). If IndexedDB isn't available, fall back to an in-memory Map.
  - Fetch misses with concurrency ≤ 4. Back off on 429. A failed zone is skipped, not fatal.
- `watchOutlines` layer:
  - Every `refreshMs` (120 s), take the alerts for the current AOI states (`useAoi.getState().states`) via the existing `nwsAlerts` adapter (import it, don't modify it).
  - Keep those with `geometry === null`, resolve their zone shapes, and emit features `{ alertId, event, severity }`.
  - Draw a dashed line (`line-dasharray`) coloured by severity (literal paint colours matching the `--extreme/--severe/--moderate` token values), with a faint fill. Layer ids are prefixed `watch-outlines`.
- Test IndexedDB with `fake-indexeddb` **only if** it's already a dependency. Otherwise inject the store interface and test with an in-memory fake. Don't add packages.

## Responsive (ADR-0014)
- Dashed outlines must stay distinguishable from WP-13 watch boxes at phone size. Use line width ≥ 1.5 and a dash pattern that reads at 390 px.
- Orchestrator checks: outlines visible at 390×844 and 844×390.

## Acceptance
- [ ] Tests: proxy URL rewrite, zone normalize (trimmed real county + forecast fixtures), cache hit avoids fetch, failed zone skipped.
- [ ] Layer toggles in the layer control.
- [ ] Orchestrator live check: on the default AOI, the Tornado Watch counties draw dashed; a reload draws them from cache (no zone requests in the network panel).
- [ ] `npm run typecheck && npm run lint && npm test` pass.
