# Next session: plan and build Waves 8–9

Handoff from the 2026-10-11 session. State at handoff: `main` = `4210f80`, pushed, clean, no worktrees.
- **Merged:** Waves 1–7 (WP-01…25).
- **Gate:** typecheck, lint and 359 tests pass; the kit builds.
- **Claude Design:** "Storm Chasers UI" project is re-synced with 9 kit components including Toast.

Supersedes `docs/next-session-wave4.md`.

## Paste this to start the session

> Plan and build Wave 8 for INFLOW (Storm Chasers repo). Read `CLAUDE.md`, `docs/next-session-wave8.md`, `docs/work-plan.md` (Waves 7–9 sections), `docs/roadmap.md`, and ADRs 0002, 0003, 0004, 0005, 0010, 0014, 0015.
> 1. **Re-verify the research below.** One background agent curl-checks every Wave 8 endpoint (CORS for the real method, keys, terms) and records UNVERIFIED where unsure. Things drift.
> 2. **Do the orchestrator prep** on `main`, then push.
> 3. **Write the packages** `docs/packages/WP-26…` in the existing format, schedule them in `docs/work-plan.md`, and **stop and show me the plan** (packages, agent count) before launching builders.
> 4. **After approval:** launch builders, verify, merge, live-check the ADR-0014 viewport matrix, and re-sync Claude Design if `src/ui` changed.

## What exists now (for orientation)
- **Brand / design.** INFLOW v1, from the Claude Design handoff in `docs/design/inflow-v1/HANDOFF.md`. Tokens are in `src/ui/tokens.css`; kit CSS is one file per component in `src/ui/css/`.
  - Layouts: `data-preset` DEFAULT, WALL, CHASE and mobile.
  - Responsive tiers: ADR-0014.
  - The repo and package names stay `storm-chasers` until trademark clearance.
- **Data.**
  - Alerts: `Alert` carries `damageThreat`, `pds`, `sent`, `messageType` and `eventKey` (VTEC office.phen.sig.number). Always de-dupe on `eventKey`; updates get new ids.
  - Hazard rules: codes are in `src/ui/hazard.ts`, re-exported with the PDS and sort rules from `src/lib/hazards.ts`.
- **Map layers** (`src/map/layers.ts`, in order): satellite, SPC outlook, radar, velocity (SRV, nearest radar, off by default), watch outlines (Watch/Warning only), SPC mesoscale discussions, SPC watch boxes, storm reports. NWS warnings and the focus are drawn in MapPanel. `mapStyle.ts` constants are parity-tested against the tokens.
- **Streams** (ADR-0013):
  - liveness via the `/api/youtube` page proxy, which sends a desktop User-Agent;
  - only feeds confirmed live autoplay;
  - only the primary is an iframe, and thumbnails are stills refreshed every 60 s, labelled `THUMB ≤5m` because YouTube caches them for 5 min;
  - a pick made this session always wins.
- **Notification groundwork:**
  - `src/panels/newAlerts.ts` holds a pure de-dupe diff (by eventKey, seeded on first load);
  - `ToastRegion` shows new TOR toasts. Reuse both for Wave 9.
- **Shared stores:**
  - `useAoi`: bbox, states, focus and `aoiRequest`;
  - `useLayout`: v3, with `preset`;
  - `useStreams`: primary and cycling.
- **Map layer controls:** `LayerControl` exports `toggleLayer`, `layerIds`, `isLayerOn` and `subscribeLayers`.

## Wave 8: any area (from the recurring-use audit, 2026-10-11; re-verify)
The app was proven on one area and one event. Outside GA/SC most panels go thin or blank.

**Orchestrator prep (shared files):**
- `src/lib/states.ts` covers only 20 states, so over IL, OH, MN, PA, the West or New England the AOI gets `states = []`, and the alerts list and cameras show nothing.
  - Generate a 50-state + DC + PR table offline, and commit it as static data with a test.
  - us-atlas states-10m (ISC licence, Census data) and Natural Earth admin-1 (public domain) are candidate sources.
  - Polygon intersection beats bounding boxes, if cheap.
  - Record the change in a new ADR (it amends ADR-0003's consequence).
- `useSource`: add a per-adapter `background` flag (`refetchIntervalInBackground`). Wave 9 needs it, because notifications must poll while the tab is hidden.

**Candidate packages:**

| Package | Scope | Notes from research |
|---|---|---|
| AOI filtering | Alerts match by polygon/bbox when there is geometry, not only by state; "no coverage" texts list what *is* covered | Needs the states prep |
| OpenMHz for any area | Drop the curated `scannerSystems` map | `GET https://api.openmhz.com/systems` lists 463 systems, 450 of them with a 2-letter state, across 41 states. **Browser fetch only** (curl gets a Cloudflare challenge). Filter by AOI states and `lastActive` within 24 h; cache 12 h. GA/SC currently show none, though 12 exist. |
| DOT cameras A | CARS IA, MN, IN through the existing `carsAdapter` | `POST {511ia.org, 511mn.org, 511in.org}/api/graphql`. The preflight has no ACAO, so add proxies like kandrive/ne511. IN returned clusters at zoom 11. |
| DOT cameras B | IBI sites through the existing `ibi511Adapter` | az511.gov, 511.idaho.gov, 511.alaska.gov, 511la.org, ctroads.org, www.nvroads.com, www.511pa.com, newengland511.org. None send CORS, so each needs a proxy. Split into two packages to avoid `CAMERA_ADAPTERS` conflicts. WA (WSDOT ArcGIS, echoes the origin) and CA (Caltrans `cwwp2.dot.ca.gov/data/d{N}/cctv/cctvStatusD{NN}.json`, CORS `*`) work directly. |
| SPC Day 1–3 (+4–8) outlooks | Day selector on the outlook layer; AOI risk badge in the top bar | Files at `https://www.spc.noaa.gov/products/outlook/day{1,2,3}otlk_{cat,torn,wind,hail,prob,sigprob}.nolyr.geojson` and `.../exper/day4-8/day{4..8}prob.nolyr.geojson`. All CORS `*`. Properties include LABEL, VALID, EXPIRE and ISSUE. |
| GOES-West | Choose East or West by AOI longitude (about 105°W) | IEM `goes_west_conus_ch13` tiles, CORS `*` |

**Blocked or deferred:**
- AL (ALGO: Incapsula bot wall);
- OK, WI and UT (403, possibly geo-blocking);
- OH (needs a key);
- NY (not this API).

## Wave 9: notifications and chasers (outline)
- **Notification engine:**
  - the browser Notification API; localhost counts as a secure context;
  - ask permission only from a click, and remember a denial;
  - raise a system notification only when the tab is hidden; otherwise use toasts or the LED;
  - de-dupe by `eventKey`, seeded on load; persist the seen set for about 48 h;
  - a user threshold (event list or severity), a rate cap, and `tag` = eventKey;
  - triggers:
    - a new NWS alert in the AOI;
    - a new SPC watch or MD;
    - an SPC risk upgrade over the AOI on a new `ISSUE` ("upcoming storms").
- **Chaser roster + LIVE NOW:**
  - `config/chasers.json`: 40–60 regular chasers by **verified** channelId (never guessed), each with a home region;
  - slow round-robin liveness over the whole roster (about 1 channel every 10 s; ADR-0013);
  - a live-first sort and a "chaser went live" trigger.
- **Hazardous Weather Outlook:**
  - `api.weather.gov/points/{lat},{lon}` gives the CWA;
  - then fetch `/products/types/HWO/locations/{CWA}` (CORS `*`).
- **Chaser GPS positions (the user's idea).**
  - The only data source is Spotter Network (`/feeds/gr.txt`, `/feeds/rss-positions.xml`; keyless, CORS `*`).
  - Its terms are personal and non-commercial only, and forbid displaying the data. The feeds also carry phone numbers and emails.
  - **v1:** an "SN MAP ↗" link-out only.
  - Drawing positions needs written permission (v2/v4): a Worker strips the PII and filters to the roster. The design is in `work-plan.md`.
- **Needs the v2 Worker:**
  - push notifications while the tab is closed (cron + Web Push);
  - YouTube Data API discovery;
  - shared caching.

## Open follow-ups (small; fold into a wave or do as orchestrator)
- **Toast:** the PDS badge is a red outline; HANDOFF §6 wants a white fill.
- **Threat button:** its aria-label should start with the visible text (WCAG 2.5.3), and a zone-only TOR press should give feedback.
- **WALL/CHASE:** the preset label persists after a manual collapse.
- **GA/FL camera walk:** back off after repeated failures (it re-walks about 50 pages every 60 s).
- **Toast/a11y:** add component tests for focus/isTyping in ToastRegion.
- **Velocity:** confirm live that the WeatherWise link (`web.weatherwise.app/#m=RADAR&rt=K{SID}&rp=N0S&map=8/lat/lon`) opens the right site and product.
- **conventions.md** (`.design-sync/`) doesn't mention Toast, StatusLed shapes or semantic tokens yet. It belongs to the user, so propose edits rather than rewriting it.

## Process rules that cost us when skipped
These are also in agent memory.
- **Before a wave:**
  - push `main` first; worktrees branch from `origin/main`;
  - give builders and verifiers short-path worktrees, and have them `cd` and `npm ci` in **one** command. **Never run npm in the main repo**: once it half-deleted `node_modules` while the dev server held esbuild.
  - never give one directory both `Foo.tsx` and `foo.ts` (Windows case clash).
  - builders don't start dev servers or use the browser. They write with Write/Edit, not heredocs (that includes the orchestrator: a heredoc mangled `\b` into a control character).
- **Gate:** `typecheck && lint && test && build:ui`, run with `set -o pipefail`.
- **Merging:**
  - merge each package as soon as it passes;
  - tell later builders to `git merge origin/main`, because new shared-type fields break their fixtures otherwise;
  - read builder reports critically before verification (county-only zones, the cached-thumbnail freshness claim and NWS update ids were all caught that way).
- **After merging,** live-check in the browser pane: data plus the ADR-0014 viewport matrix for every preset.
  - The pane runs rAF at 0 when unfocused, so a black map is the environment, not a bug. Click the map to wake it.
  - Ref-based clicks mis-scale in the pane; use JS for logic checks.
- **After a script rewrites shared CSS,** check computed styles (body margin, box-sizing). Passing tests did not catch an emptied `base.css`.
