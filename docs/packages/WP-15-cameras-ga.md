# WP-15 — DOT cameras: Georgia (511GA)
Wave 4 **only if gate V3 passes and the key question is settled**, else Wave 5 · ADRs: 0001, 0002, 0004, 0005

## Goal
GA traffic camera snapshots in `CCTV-01` when the AOI includes GA.

## Owns
`src/sources/ga511/**` (adapter, pure normalize, fixture, test).
Registry edits allowed:
- `CAMERA_ADAPTERS` and the `NO_COVERAGE` text in `src/panels/CamerasPanel.tsx`;
- one `/api/ga511` proxy entry in `vite.config.ts` if gate V3 says one is needed.

## Forbidden
Everything else. No API key in the repo (ADR-0001).

## Verified facts
- **Search lead only (not curl-checked):** 511GA's documented developer API is `GET https://511ga.org/api/v2/get/cameras?key=…&format=json`. It **requires a registered key** and is throttled to 10 calls/60 s. Records carry `Latitude`, `Longitude`, `Name`, `Url` (snapshot), `VideoUrl` (.m3u8) and `Status`. Docs: https://511ga.org/help/endpoint/cameras
- **That API breaks ADR-0001 (keyless).** Two ways forward, decided before launch:
  1. **Gate V3:** from an allowed network, find the keyless list the 511ga.org public map itself loads. Check its method, CORS for the real request, bbox params, snapshot host and terms, and commit a trimmed response as the fixture.
  2. Or accept a key via a new ADR. A key can't ship in a client-only SPA, so that only makes sense once the v2 Worker exists. That would defer GA to v2.
- Everything else: UNVERIFIED (511ga.org blocked from the 2026-10-10 planning sandbox).

## Build (keyless case)
- `ga511Cameras: CameraAdapter` with `state: 'GA'`. Fetch the list once per refresh and filter to the AOI bbox in `normalize`. Must be pure: bbox from the argument, no clock.
- Skip records with no snapshot URL or a status other than active.
- `NO_COVERAGE` text: append `GA`.

## Acceptance
- [ ] Normalize test against the committed fixture, including a skipped record.
- [ ] Live (orchestrator): pan to Atlanta → GA snapshots refresh.
- [ ] Checks pass.
