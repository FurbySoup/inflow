# WP-12 — DOT cameras: South Carolina (511SC, Iteris)
Wave 4 · Depends on orchestrator prep P0 · ADRs: 0002, 0004, 0005

## Goal
Add SC cameras to `CCTV-01`. This closes the camera gap in the default GA/SC live-proofing AOI together with WP-11.

## Owns
`src/sources/sc511/**`.
Registry edits allowed:
- append `southCarolinaCameras` to `CAMERA_ADAPTERS` in `src/panels/CamerasPanel.tsx`;
- add the proxy entry `/api/511sc` → `https://sc.cdn.iteris-atis.com` in `vite.config.ts` (`rewrite` strips the prefix).

## Forbidden
Everything else, including the `NO_COVERAGE` text (the orchestrator updates it at merge). Use `CameraFeed`; if it's insufficient, stop and report.

## Verified facts (2026-10-10, curl)
- 511SC is **Iteris ATIS "SafeTravel4", not CARS**. Don't reuse `carsAdapter`.
- **List:** `GET https://sc.cdn.iteris-atis.com/geojson/icons/metadata/icons.cameras.geojson` → 200 JSON, ~695 KB, a GeoJSON FeatureCollection of all 789 cameras. There's no bbox query, no clustering and no zoom dependence. `Cache-Control: max-age=60`.
- Feature: Point `[lon, lat]`; `properties: { id: "2735", name: "10002", description: "I-77 S @ MM 4.9", route, direction, active, image_url: "https://scdotsnap.us-east-1.skyvdn.com/thumbs/10002.flv.png", https_url: <HLS m3u8> }`.
- **No CORS**: GET has no ACAO and OPTIONS returns 403 → always fetch via `/api/511sc`.
- **Snapshots:** `image_url` 301-redirects to `https://scdotsnap.us-east-1.skyvdn.com/10002.png` → 200 `image/png` 720×480, with or without Referer. Use `image_url` directly in `<img>`; no proxy needed.
- Terms: UNVERIFIED. Local use only; flagged for the v2 terms gate.

## Build
- `southCarolinaCameras` adapter: query only when AOI `states` includes `SC`. `refreshMs` 60 s is fine for snapshots, but cache the list in module memory for **15 min** (695 KB).
- `normalize(raw, bbox)` (pure): keep `active` features inside bbox → `CameraFeed` with `id` `sc511:<id>`, `title` `description` (fall back to `route direction`), `snapshotUrl` `image_url`, `streamUrl` null (HLS isn't wired in the panel), `state: 'SC'`.
- Commit a trimmed real fixture (3–5 features incl. one `active: false`).

## Acceptance
- [ ] Tests: bbox filter, inactive skip, title fallback.
- [ ] Orchestrator live check: default AOI → SC snapshots (e.g. Columbia/I-26) render next to GA.
- [ ] `npm run typecheck && npm run lint && npm test` pass.
