# WP-07 — DOT cameras: Kansas + Nebraska (CARS)
Wave 1 · ADRs: 0002, 0004, 0007

## Goal
`CCTV-01` panel: auto-refreshing grid of traffic camera snapshots inside the AOI, from KanDrive (KS) and Nebraska 511, which share the CARS backend.

## Owns
`src/sources/cars/**`, `src/panels/CamerasPanel.tsx`.
Registry edit allowed: in `App.tsx` replace the `CCTV-01` `<Placeholder>` with `<CamerasPanel />`.

## Forbidden
Everything else. Use `CameraFeed`; if insufficient, stop and report.

## Verified facts (2026-10-10)
- `POST https://www.kandrive.gov/api/graphql` and `POST https://511.nebraska.gov/api/graphql` — CORS `*`, no key.
- Operation `mapFeaturesQuery` with variables including `layerSlugs: ["normalCameras"]` and a bounding box; returned 535 KS cameras, each with point coordinates and `views[].url` (snapshot JPEG; KS images on `kscam.carsprogram.org` return 200). ~44 KS views have `url: null` → skip.
- Get the exact query text and variable shape by curling the endpoint (or reading the site's network requests) once, and **commit a trimmed real response** as the fixture.
- NE image host `dot511.nebraska.gov` was UNVERIFIED (timed out from UK) — handle image load errors gracefully.

## Build
- One adapter factory `carsAdapter({ id, state, endpoint })` → `kansasCameras`, `nebraskaCameras`. Query only when AOI `states` includes that state; pass AOI bbox.
- Panel: thumbnail grid (max 12, nearest to AOI centre first), each refreshes its `<img>` every 60 s via `?t=` cache-buster; click enlarges in-panel. Broken image → hide tile.
- Export the adapter list from `CamerasPanel.tsx` as `const CAMERA_ADAPTERS = [...]` so WP-08 can append one entry.
- Empty state for AOIs with no coverage (e.g. GA/SC): `NO DOT CAMERA COVERAGE IN AOI — KS · NE · TX`.

## Acceptance
- [ ] Panning the map to Wichita shows live KS snapshots.
- [ ] Normalize tested against the committed fixture, including a `url: null` view.
- [ ] Checks pass.
