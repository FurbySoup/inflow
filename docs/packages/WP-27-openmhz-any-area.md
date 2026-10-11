# WP-27 — OpenMHz scanner systems for any area
Wave 8 · Depends on prep P8a (52-code AOI states) · ADRs: 0002, 0004, 0005, 0006, 0014

## Goal
Replace the curated `scannerSystems` map (OK/KS/TX only) with OpenMHz's own systems list, so every AOI offers the systems that exist there. Today GA/SC shows "NO SCANNER SYSTEMS IN AOI" although 12 exist.

## Owns
`src/sources/openmhz/**`, `src/panels/AudioPanel.tsx`, `config/audio.json` (delete it: `scannerSystems` is its only key).

## Forbidden
`src/lib/*`, `src/state/*`, `src/ui/*`, `src/types/index.ts`, `vite.config.ts` (no proxy: OpenMHz stays browser-direct, ADR-0005), the KiwiSDR half of the panel (keep it as is).

## Verified facts (2026-10-11)
- `GET https://api.openmhz.com/systems` → `200` JSON `{ success: true, systems: [...] }`. 465 systems; 452 have a 2-letter `state` (13 are `null`); 41 states including DC.
- Fields per system: `shortName`, `name`, `city` (nullable), `county` (nullable), `state`, `active` (bool), `lastActive` (ISO), `callAvg`, `clientCount`, `systemType`, `description`.
- **Cross-origin browser fetch works.** It was fetched from an https://example.com page in a browser, and `/{shortName}/calls` works too.
  - curl's default User-Agent gets a 403 HTML page. **For your fixture, use** `curl -s -A "Mozilla/5.0" https://api.openmhz.com/systems`.
  - Trim the fixture to about 8 systems, including: a GA one (`atlps`), an SC one (`yorksc`), a `state: null` one, and one with `lastActive` older than 24 h (edit its date if none exists, and say so in a comment).
- GA today: `camden, chatham, effingham, atlps, sogatl, marta_p25, segarrn26`. SC: `palm800, aikenfire, p800a, fireems, yorksc`.

## Build
- **`systems.ts`:**
  - an adapter `openmhzSystems: SourceAdapter<OpenMhzSystemsRaw, ScannerSystem>`, `refreshMs` 30 min;
  - `fetch` caches the list in module memory for 12 h, the way `src/sources/ibi511/adapter.ts` caches its walk. A failed fetch is not cached.
    - Why: `useSource` keys on the bbox, so every pan would otherwise re-download 465 systems.
  - `fetch` returns `{ fetchedAt: number, systems }`, so `normalize` stays pure.
  - `normalize`:
    - keeps systems with a 2-letter `state` and `lastActive` within 24 h of `fetchedAt`;
    - maps them to `ScannerSystem { shortName, name, state, place (city ?? county ?? ''), lastActive }`;
    - sorts by state, then `name`.
  - Pure `systemsInAoi(systems, states)` filters by state.
- **AudioPanel:**
  - Use `useSource(openmhzSystems)` and `systemsInAoi`.
  - The `<select>` option text is `name · place (ST)`.
  - Keep the `ScannerPlayer` keyed by `shortName`.
  - Empty AOI text lists coverage: `NO OPENMHZ SYSTEMS IN AOI — COVERED: AL · AZ · …` (the distinct states in the list).
  - While the list is loading, show `LOADING SYSTEMS`. On error, show `OPENMHZ UNAVAILABLE`.
- Update `calls.test.ts`, which currently counts curated KS systems. Delete `config/audio.json` and its import.
- No fixed widths: the select is `maxWidth: 100%` already (ADR-0014).

## Acceptance
- [ ] Tests:
  - normalize drops `state: null` and systems inactive for more than 24 h;
  - `systemsInAoi(['GA','SC'])` returns the fixture's GA and SC systems;
  - a 12 h cache hit makes no second fetch (mock `fetch`);
  - a failed fetch isn't cached.
- [ ] Orchestrator live check:
  - the default GA/SC AOI lists the 12 systems, and PLAY LATEST plays a call;
  - panning to Ohio changes the list;
  - over the Gulf you get the coverage text.
- [ ] `npm run typecheck && npm run lint && npm test` pass.
