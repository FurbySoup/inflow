# WP-08 — TxDOT cameras via proxy
Wave 2 · Depends on WP-07 merged · ADRs: 0002, 0005

## Goal
Add Texas cameras to `CCTV-01`.

## Owns
`src/sources/txdot/**`.
Registry edits allowed: append the TxDOT adapter to `CAMERA_ADAPTERS` in `src/panels/CamerasPanel.tsx`; add proxy `/api/txdot` → `https://its.txdot.gov` in `vite.config.ts`.

## Verified facts (2026-10-10)
- List: `GET https://its.txdot.gov/its/DistrictIts/GetCctvStatusListByDistrict?districtCode=AUS` → cameras with lat/lon. Per-district (district codes e.g. `AUS`, `DAL`, `FTW`, `HOU`, `SAT`, `AMA`, `LBB`, `ABL`, `WFS`, `ELP` — confirm the list from the TxDOT ITS site and record it in the adapter).
- Snapshot: `GET …/GetCctvSnapshotByIcdId?icdId={id}&districtCode={code}` → JSON containing a **base64 JPEG**. Render as `data:image/jpeg;base64,…`.
- **No CORS** → always via `/api/txdot`.

## Build
- Choose districts whose rough bbox intersects the AOI (hardcoded district bboxes are fine).
- `CameraFeed.snapshotUrl` can't be a plain URL here: set it to the proxied snapshot endpoint and have the panel detect TxDOT feeds (`id` prefix `txdot:`) to fetch and decode. If that requires changing `CameraFeed` or panel internals beyond the adapter list, stop and report the needed change.

## Acceptance
- [ ] Panning to Austin shows TX snapshots.
- [ ] Normalize + district selection tested.
- [ ] Checks pass.
