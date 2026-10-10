# WP-06 — Audio panel (OpenMHz scanner + KiwiSDR ham/CB)
Wave 1 · ADRs: 0002, 0005, 0006, 0007

## Goal
`AUD-01` panel: play recent scanner calls for AOI states from OpenMHz; list nearest KiwiSDR receivers as link-outs preset for CB ch. 19 and ham 2 m.

## Owns
`src/sources/openmhz/**`, `src/sources/kiwisdr/**`, `src/panels/AudioPanel.tsx`, `config/audio.json`.
Registry edits allowed: in `App.tsx` replace the `AUD-01` `<Placeholder>` with `<AudioPanel />`; in `vite.config.ts` add proxy `/api/kiwisdr` → `http://rx.linkfanel.net` (path rewrite like `/api/nws`).

## Forbidden
Everything else. Use `AudioFeed` from shared types; if insufficient, stop and report.

## Verified facts (2026-10-10)
- OpenMHz: `GET https://api.openmhz.com/systems` (461 systems), `GET https://api.openmhz.com/{shortName}/calls` → calls with mp3 `url`, `talkgroupNum`, `time`, `freq`. **Cloudflare blocks curl/server-side; browser fetch works with CORS.** So fetch directly from the browser, never via proxy. Build test fixtures by hand from the field list above.
- Plains/SE system shortNames: OK `normanok`; KS `litchfield`, `ksicssal`, `greatbend`, `edcoks`, `staffordco`; TX `arcs`, `ncpstx`, `scpstx`, `dal_l1`, `bexar`; NE none. Put this state→systems map in `config/audio.json` (systems list response lacks reliable state fields).
- KiwiSDR directory: `GET http://rx.linkfanel.net/kiwisdr_com.js` returns JS `var kiwisdr_com=[...];` — strip the prefix/suffix and `JSON.parse`. Entries have `gps: "(lat, lon)"`, `url`, `users`, `offline`, `bands`. No CORS → via `/api/kiwisdr/kiwisdr_com.js`. Refresh 30 min.
- KiwiSDR receivers are plain HTTP: **link-out only, no iframe**. Preset URL `{url}/?f=27185am` (CB ch 19) — documented format, untested.

## Build
- Scanner section: dropdown of systems for AOI states → plays newest calls sequentially in one `<audio>` (auto-advance), shows talkgroup + time (`--font-data`). Poll calls every 30 s.
- Radio section: 5 nearest online receivers to AOI centre (haversine) that cover 27 MHz (`bands` includes it) → link buttons `CB 19`, and `2M` only if band coverage includes 144 MHz.
- Empty states: `NO SCANNER SYSTEMS IN AOI` etc. — never a blank panel.
- Wrap in `<Panel code="AUD-01" title="Radio / Scanner" …>` with `queryStatus()`.

## Acceptance
- [ ] KiwiSDR parse + nearest-receiver sort tested with a fixture; OpenMHz normalize tested.
- [ ] Panel works for GA/SC AOI (likely empty scanner → clear empty state, receivers listed) and for KS AOI (scanner systems present).
- [ ] Checks pass.
