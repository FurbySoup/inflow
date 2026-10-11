# WP-28 — DOT cameras: Iowa, Minnesota, Indiana (CARS)
Wave 8 · Depends on prep P8a, P8c (proxy routes and `CAMERA_SOURCES` are on `main`) · ADRs: 0002, 0004, 0005, 0014

## Goal
Add IA, MN and IN cameras to `CCTV-01` through the existing `carsAdapter` factory (KS/NE).

## Owns
`src/sources/cars/**`.
Registry edit allowed: append three entries to `CAMERA_SOURCES` in `src/panels/CamerasPanel.tsx`:

```ts
{ adapter: iowaCameras, states: ['IA'], attribution: '511IA' },
{ adapter: minnesotaCameras, states: ['MN'], attribution: '511MN' },
{ adapter: indianaCameras, states: ['IN'], attribution: '511IN' },
```

## Forbidden
`vite.config.ts` (the routes already exist, see below), the rest of `CamerasPanel.tsx`, `src/lib/*`, `src/state/*`, `src/ui/*`, `src/types/index.ts`.

## Verified facts (2026-10-11, curl, same query and variables as `MAP_FEATURES_QUERY`)
- Proxy routes are on `main`:
  - `/api/511ia` → `https://511ia.org/api`;
  - `/api/511mn` → `https://511mn.org/api`;
  - `/api/511in` → `https://511in.org/api`.
  - So the endpoints are `/api/511ia/graphql`, `/api/511mn/graphql`, `/api/511in/graphql`.
  - Why a proxy: the POST answers with ACAO `*`, but the OPTIONS preflight hits a CloudFront SPA shell with no ACAO.
- The response has the same shape as KS/NE (`data.mapFeaturesQuery.mapFeatures[]`, with `Camera` and `Cluster` typenames). No key.
- **Zoom at which results stop being clusters** (this is the important difference):
  - **MN:** z9 is enough (Minneapolis z9 → 196 cameras, 0 clusters).
  - **IA:** z9 → 7 cameras + 5 clusters; z10 → 17 + 8; **z11 → 100 cameras, 0 clusters**. 100 looks like a per-response server cap.
  - **IN:** z9 clusters; z10 32 + 6; z11 68 + 4; z12 79 + 2; **z13 → 91 cameras, 0 clusters**.
- Snapshot hosts are plain `<img>` (no CORS needed):
  - IA: `atmsqf.iowadot.gov`;
  - MN and IN: `public.carsprogram.org/cameras/{MN,IN}/…` (IN files end `.flv.png`).

## Build
- Add an optional `zoom` to `carsAdapter({ id, state, endpoint, zoom = 9 })` and send it as `input.zoom`. KS/NE keep 9.
- Exports:
  - `iowaCameras` (`ia-cameras`, `IA`, `/api/511ia/graphql`, zoom 11);
  - `minnesotaCameras` (`mn-cameras`, `MN`, `/api/511mn/graphql`, 9);
  - `indianaCameras` (`in-cameras`, `IN`, `/api/511in/graphql`, 13).
- `normalize` must keep **ignoring `Cluster` features**. Add a test for a mixed camera + cluster response if none exists.
- Fixtures: one trimmed real response per new state (3–5 cameras, plus one cluster where you got one). Record each by POSTing to the upstream host with curl, as in `adapter.test.ts`.
- Comment the zoom values with the facts above.

## Acceptance
- [ ] Tests: each new fixture normalizes to `CameraFeed`s with the right `state` and id prefix; clusters are skipped; the zoom argument reaches the request body (mock `fetch`).
- [ ] Orchestrator live check: pan to Des Moines, Minneapolis and Indianapolis; snapshots render; the footer lists the source; 390×844 has no horizontal scroll.
- [ ] `npm run typecheck && npm run lint && npm test` pass.
