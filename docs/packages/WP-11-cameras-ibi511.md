# WP-11 — DOT cameras: Georgia + Florida (IBI 511 platform)
Wave 4 · Depends on orchestrator prep P0 · ADRs: 0002, 0004, 0005

## Goal
Add GA (511GA) and FL (FL511) cameras to `CCTV-01`. Both run the same IBI/Arcadis "511" platform, so one adapter factory serves both.

## Owns
`src/sources/ibi511/**`.
Registry edits allowed:
- append `georgiaCameras, floridaCameras` to `CAMERA_ADAPTERS` in `src/panels/CamerasPanel.tsx`;
- add proxy entries `/api/511ga` → `https://511ga.org` and `/api/fl511` → `https://fl511.com` in `vite.config.ts` (same shape as `/api/txdot`, `rewrite` strips the prefix).

## Forbidden
Everything else, including the `NO_COVERAGE` text (the orchestrator updates it at merge). Use `CameraFeed`; if it's insufficient, stop and report.

## Verified facts (2026-10-10, curl)
- **Keyless list:** `GET /List/GetData/Cameras?query=<urlencoded {"columns":[],"start":N,"length":100}>&lang=en` → 200 JSON `{recordsTotal, data[]}`. **Page size is capped at 100** (GA `recordsTotal` 4331 → 44 pages of ~123 KB; FL 4965 → ~50 pages).
- Record fields: `id`, `location` (title, e.g. `BART-0209: SR 140 at Princeton Blvd (BARTOW)`), `roadway`, `direction`, `latLng.geography.wellKnownText: "POINT (-84.91445 34.37697)"` (WKT, lon lat), `images[]: {id, imageUrl: "/map/Cctv/18551", disabled, blocked, videoUrl, isVideoAuthRequired: true}`.
- **No CORS** on the JSON endpoints (no ACAO; OPTIONS also lacks it) → always fetch via `/api/511ga`, `/api/fl511`.
- **Snapshots** `https://511ga.org/map/Cctv/<imageId>` → 200 `image/png`, `ACAO:*`, `max-age=60`, works with a localhost Referer. FL `https://fl511.com/map/Cctv/<id>` → `image/jpeg`. Use the **absolute upstream URL** for `snapshotUrl` (plain `<img>`, no proxy).
- `/map/mapIcons/Cameras` returns `itemId` = **camera site id** (11141), not the image id (18551) → it can't build snapshot URLs. Don't use it.
- The keyed API (`/api/v2/get/cameras`) needs registration and is throttled. **Don't use it.**
- Video is HLS with `isVideoAuthRequired: true` → `streamUrl: null`.
- Terms: UNVERIFIED (no terms page found). Local use only; flagged for the v2 terms gate.

## Build
- `ibi511Adapter({ id, state, base, bbox })` → `georgiaCameras` (`/api/511ga`, `GA`) and `floridaCameras` (`/api/fl511`, `FL`). Query only when AOI `states` includes `state`.
- `fetch`: walk all pages (concurrency ≤ 4, honour `signal`). The list is effectively static: **cache the walked list in module memory for 12 h** so the 60 s panel refresh doesn't re-walk it. `fetch` then returns the cached records; filtering happens in `normalize`.
- Optional optimisation: if the DataTables query accepts a `search`/geo filter that cuts the walk, use it. Only use it if you verify it by curl, and record what you found in the adapter comment.
- `normalize(raw, bbox)` (pure): parse WKT, drop records whose first image is `disabled`/`blocked` or missing, keep those in bbox, map to `CameraFeed` with `id` `511ga:<id>` / `fl511:<id>`, `snapshotUrl` = `base host + imageUrl`, `title` = `location`, `state`.
- Commit a **trimmed real response** (3–5 records incl. one disabled image) per state as fixtures.

## Acceptance
- [ ] Tests: WKT parsing, bbox filter, disabled/blocked skip, page-walk stops at `recordsTotal` (mocked fetch).
- [ ] Orchestrator live check: default GA/SC AOI → GA snapshots render; pan to Orlando → FL snapshots.
- [ ] Network: a second refresh within 12 h doesn't re-walk the list.
- [ ] `npm run typecheck && npm run lint && npm test` pass.
