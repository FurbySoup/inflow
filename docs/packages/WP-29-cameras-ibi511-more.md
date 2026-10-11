# WP-29 — DOT cameras: eight more IBI 511 sites + walk back-off
Wave 8 · Depends on prep P8a (`stateAt`), P8c (proxy routes, `CAMERA_SOURCES`) · ADRs: 0002, 0004, 0005, 0014, **0016**

## Goal
Add AZ, ID, AK, LA, CT, NV, PA and New England (VT/NH/ME) cameras through the existing `ibi511Adapter` factory (GA/FL). Fold in the Wave 7 follow-up: a failing list walk must back off, not re-walk about 50 pages every 60 s.

## Owns
`src/sources/ibi511/**`.
Registry edit allowed: append these entries to `CAMERA_SOURCES` in `src/panels/CamerasPanel.tsx`:

```ts
{ adapter: arizonaCameras, states: ['AZ'], attribution: 'AZ511' },
{ adapter: idahoCameras, states: ['ID'], attribution: '511 Idaho' },
{ adapter: alaskaCameras, states: ['AK'], attribution: '511 Alaska' },
{ adapter: louisianaCameras, states: ['LA'], attribution: '511LA' },
{ adapter: connecticutCameras, states: ['CT'], attribution: 'CTroads' },
{ adapter: nevadaCameras, states: ['NV'], attribution: 'NVroads' },
{ adapter: pennsylvaniaCameras, states: ['PA'], attribution: '511PA' },
{ adapter: newEnglandCameras, states: ['VT', 'NH', 'ME'], attribution: 'New England 511' },
```

## Forbidden
`vite.config.ts` (routes exist), the rest of `CamerasPanel.tsx`, `src/lib/*` (call `stateAt` read-only), `src/state/*`, `src/ui/*`, `src/types/index.ts`.

## Verified facts (2026-10-11, curl)
- Every site serves the same keyless list as GA/FL: `GET /List/GetData/Cameras?query=<{"columns":[],"start":N,"length":100}>&lang=en`, the same `Ibi511ListResponse` shape, a relative `imageUrl` (`/map/Cctv/<id>`), and **no CORS**. Proxy routes are on `main`:

| Proxy | Upstream host (for `host`) | recordsTotal |
|---|---|---|
| `/api/az511` | `https://az511.gov` | 644 |
| `/api/511id` | `https://511.idaho.gov` | 457 |
| `/api/511ak` | `https://511.alaska.gov` | 130 |
| `/api/511la` | `https://511la.org` | 336 |
| `/api/ctroads` | `https://ctroads.org` | 347 |
| `/api/nvroads` | `https://www.nvroads.com` | 652 |
| `/api/511pa` | `https://www.511pa.com` | 1565 |
| `/api/newengland511` | `https://newengland511.org` | 408 (VT, NH and ME in one list) |

- Snapshots `/map/Cctv/<id>` → 200 image/jpeg, ACAO `*`.
  - 511PA and New England 511 send ACAO **twice**, which is fine for a plain `<img>`.
  - **Never** use `fetch()` or `crossOrigin` on them.
- Extra fields exist on some sites: AK `refreshRateMs`, LA/NV `videoUrl`/`videoType`. Ignore them; `streamUrl` stays null.

## Build
- **Multi-state support.** Change the factory option `state: string` to `states: string[]` and keep a `state` getter only if something still needs it. `CameraFeed.state` per camera:
  - single-state sites use their one state;
  - New England uses `stateAt(lng, lat)` from `src/lib/states.ts`, falling back to `'VT'`.
  - Update the GA/FL exports to `states: ['GA']` / `['FL']`.
- **Exports:** the eight adapters in the table, with ids `az511-cameras`… and id prefixes `az511:`… (unique per site).
- **Back-off (Wave 7 follow-up).** After a failed walk, the next walk may start only after a back-off of 1, 2, 4, 8, 16, then 30 min (capped), reset on success.
  - Until then, `fetch` rejects quickly with the last error, so the panel shows its error state.
  - Keep the "a failed walk is not cached" rule.
- **Fixtures:** a trimmed real first page (3–5 records) for **PA** and **New England** (with at least one VT and one NH or ME record). The other six share the shape, so their adapters are covered by a table test of their config (id, proxy, host, states).

## Acceptance
- [ ] Tests:
  - New England cameras get VT/NH/ME from `stateAt`;
  - the PA fixture normalizes;
  - back-off: after a failure, a second `fetch` inside the window doesn't call the network; after the window it does; success resets it (fake timers);
  - the existing GA/FL tests still pass.
- [ ] Orchestrator live check: pan to Phoenix, Pittsburgh and Burlington VT; snapshots render; tiles stay inside `cam-grid` at 390×844.
- [ ] `npm run typecheck && npm run lint && npm test` pass.
