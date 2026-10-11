# WP-34 — AOI local time in the top bar
Wave 8 · ADRs: 0002, 0003, 0005, 0014 · Wave 9 reuses the `/points` adapter (HWO needs `cwa`)

## Goal
User report (2026-10-11): the top bar shows UTC and the device's local time. A chaser watching Oklahoma from Georgia needs **the time where the AOI is** (warning text and local reports use it). Show UTC plus the AOI's local time. Show device local time only when it differs and there's room.

## Owns
- New `src/sources/nws/points.ts` (+ `points.test.ts`, `fixtures/points-ffc.json`).
- New `src/panels/clock.ts` (+ test).
- The clock part of `src/panels/Topbar.tsx`: the `UTC` and `LOCAL` items and `fmt`.

WP-31 adds one `<OutlookRisk />` line to Topbar in the same wave; don't touch other items.

## Forbidden
`src/lib/*`, `src/state/*`, `src/ui/*`, `src/index.css` (the `.topbar-local` hide rule at mid-width already exists, so reuse that class), `vite.config.ts` (`/api/nws` exists), `src/sources/nws/alerts.ts`.

## Verified facts (2026-10-11, curl)
- `GET https://api.weather.gov/points/{lat},{lon}` (lat and lon up to 4 decimals).
  - Through the existing proxy: `/api/nws/points/33.7,-84.4`. The proxy adds the required User-Agent.
  - Returns `properties.timeZone` (`"America/New_York"`), `properties.cwa` (`"FFC"`), `properties.radarStation` (`"KFFC"`), and `properties.relativeLocation.properties.{city,state}`.
  - CORS is `*` upstream, but use the proxy for the UA.
- **Offshore points return HTTP 500** (checked 30,-60), not 404. Outside NWS coverage, treat any non-200 as "no zone".

## Build
- **`points.ts`:**
  - `nwsPoint: SourceAdapter<NwsPointRaw, NwsPoint>` takes the AOI **centre**, rounded to 0.1°, so small pans don't re-request. That gives a stable query key: fetch uses the rounded centre.
  - `refreshMs` 6 h. Cache by rounded key in module memory, so returning to an area costs nothing.
  - `NwsPoint { cwa, timeZone, radarStation, place: "City, ST" | null }`.
  - On a non-200, `fetch` resolves `null` and `normalize` returns `[]`. It must not throw: offshore isn't an error state.
- **`clock.ts`** (pure, takes `now`):
  - `zoneLabel(now, timeZone)` gives `14:02 EDT` via `Intl.DateTimeFormat('en-US', { timeZone, hour12: false, hour, minute, second, timeZoneName: 'short' })`;
  - `sameOffset(now, zoneA, zoneB)`.
- **Topbar:**
  - `UTC 18:02:11Z` (unchanged);
  - then `AOI 14:02:11 EDT`, from the AOI centre zone. Use `title` for the place, e.g. "Atlanta, GA (AOI centre)"; the title is not the only carrier of meaning;
  - then `LOCAL …` only when the device offset differs from the AOI zone. Keep the class `topbar-local`, so the mid-width tier still hides it;
  - with no zone (offshore, or still loading), `AOI —`.
  - The AOI time item must survive mid-width; only device LOCAL hides.
- An AOI spanning two zones uses the centre. Say so in the `title`.

## Acceptance
- [ ] Tests:
  - `points.normalize` on the fixture;
  - a non-200 → `[]` without throwing;
  - rounding gives one request for two nearby centres (mock `fetch`);
  - `zoneLabel` for `America/Chicago` at a fixed instant (CDT vs CST across a DST date);
  - `sameOffset`.
- [ ] Orchestrator live check: default AOI shows EDT; pan to Oklahoma → CDT, and device LOCAL appears; Phoenix shows MST in summer; over the Atlantic `AOI —`. Matrix rows 1366 and 390 (top bar fits or scrolls inside itself, ADR-0014).
- [ ] `npm run typecheck && npm run lint && npm test` pass.
