# WP-14 — DOT cameras: South Carolina (SC511)
Wave 4 **only if gate V2 passes**, else Wave 5 · ADRs: 0002, 0004, 0005

## Goal
SC traffic camera snapshots in `CCTV-01` when the AOI includes SC (the 2026-10-10 live-proofing area had none).

## Owns
`src/sources/sc511/**`. If SC511 turns out to be CARS, this is just a fixture + test for the new endpoint, because the adapter is `carsAdapter`.
Registry edits allowed:
- `CAMERA_ADAPTERS` and the `NO_COVERAGE` text in `src/panels/CamerasPanel.tsx`;
- one `/api/sc511` proxy entry in `vite.config.ts`.

## Forbidden
Everything else. Don't modify `src/sources/cars/adapter.ts`. If `carsAdapter` needs a change, stop and report.

## Verified facts
- **Gate V2 (orchestrator, from an allowed network, before launch).** All of this is UNVERIFIED as of 2026-10-10: every SC511 host was blocked from the planning sandbox.
  1. Find the canonical host (`511sc.org` / `scdot511.org` / `sc511.org`).
  2. Does `POST <host>/api/graphql` with the `mapFeaturesQuery` body from `src/sources/cars/adapter.ts` return cameras? If it does, it's CARS. Expect the same preflight failure as KS/NE, so it needs a proxy.
  3. Snapshot image host and status code.
  4. Terms of use.
  5. Commit a trimmed real response as `src/sources/sc511/fixtures/cameras.json`.
- **If the check fails** (it isn't CARS): rewrite this package around the endpoint you found before launching, or defer it.

## Build (CARS case)
- `export const southCarolinaCameras = carsAdapter({ id: 'sc511-cameras', state: 'SC', endpoint: '/api/sc511/graphql' })`.
- Proxy entry mirroring `/api/kandrive` (rewrite to `/api`).
- `NO_COVERAGE` text: append `SC`.
- Test: the existing `carsAdapter` normalize applied to the SC fixture yields cameras with coordinates; `url: null` views are skipped.

## Acceptance
- [ ] Normalize test against the committed SC fixture.
- [ ] Live (orchestrator): the default GA/SC AOI shows SC snapshots (Columbia/Charleston) refreshing every 60 s.
- [ ] Checks pass.
