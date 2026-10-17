# WP-42 — Audio panel: honest LED and distinguishable scanner systems
Wave 10 · Follows WP-06, WP-27 · ADRs: 0012, 0018

## Goal
Two small defects in AUD-01 (`src/panels/AudioPanel.tsx`):
1. **The panel LED ignores the OpenMHz systems list.** `status={queryFeed(directory, kiwisdrDirectory.refreshMs)}` reflects only the KiwiSDR directory. If OpenMHz fails, the body says UNAVAILABLE while the LED stays green.
2. **Duplicate system names.** OpenMHz has several systems that share a `name`, and the picker shows identical rows.

## Owns
`src/panels/AudioPanel.tsx` (+ `AudioPanel.test.tsx`), `src/sources/openmhz/systems.ts` (+ `systems.test.ts`, fixtures).

## Forbidden
`src/lib/*` (including `feedStatus.ts`), `src/ui/*`, `src/state/*`, `vite.config.ts`. If you believe a shared helper is needed, stop and report.

## Verified facts (live `api.openmhz.com/systems`, 2026-10-13; never edit)
Pairs sharing a name, as `shortName` (place):
- `afrn` / `airs`: "Alabama Interoperable Radio System" (AL, neither has a city or county)
- `pwcva` / `pwpdfd`: "Prince William County VA" (both county Prince William)
- `palm800` (Sumter) / `fireems` (county "Florence " with a **trailing space**): "Palmetto 800", SC
- `tippco` / `tippcounty`: "Tippecanoe County", IN
- `cnyicc` / `cnyicc2`: "Central New York Interoperable Communications Consortium CNYICC" (both Onondaga)
- `loudounal1` / `lcso`: "Loudoun County" (both Loudoun), VA
- `mwaaal1` / `mwaa`: "Metropolitan Washington Airports Authority", VA

Several pairs share both name and place, so the place does not tell them apart. The `shortName` does.

## Build
- **Picker label.** Add pure `systemLabel(system, all)` in `systems.ts`.
  - Today's label: `name · place (ST)`, or `name (ST)` with no place.
  - When another system in `all` has the same `name`, append ` · <shortName>`.
  - Trim `place` in `normalizeSystems`, since "Florence " has a trailing space.
  - `AudioPanel` uses `systemLabel` for each `<option>`, with `all` = the systems shown.
- **LED.** Combine both feeds in `AudioPanel.tsx`, with the worst status winning: `error` > `loading` > `live`.
  - Pass the merged state as `status`. Keep `updatedAt`/`refreshMs` from the directory, so the stale rule keeps working.
  - Write the merge as a small local pure function, exported for the test.
  - A comment says why: the body shows both feeds, so the LED must too.

## Acceptance
- [ ] Tests:
  - `systemLabel` for a unique name, for a duplicated name (shortName appended) and with no place;
  - trimmed place;
  - the merge function's status ordering;
  - AudioPanel: an OpenMHz error with a healthy directory gives an error LED (assert the status the kit renders, e.g. its class or `aria-label`, as existing tests do).
- [ ] Use the real `afrn`/`airs` pair (from the facts above) in the fixture or test data.
- [ ] `set -o pipefail; npm run typecheck && npm run lint && npm test && npm run build:ui` pass.
