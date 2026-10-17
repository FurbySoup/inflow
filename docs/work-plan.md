# v1 Work Plan — parallel build

How the remaining v1 features get built concurrently by Haiku sub-agents. Process rules: [ADR-0010](adr/0010-parallel-subagent-factory.md).

## Already built (foundation, orchestrator)
Basic resizing (feeds column + console row splitters, ADR-0011), shared types, adapter contract, AOI store, `useSource`, `<Panel>` chrome + tokens, map layer registry, NWS alerts (map + list), IEM radar, curated streams, dev proxy for NWS.

## Status
- Wave 1 (WP-01, 02, 03, 05, 06, 07): **merged** 2026-10-10. Verifier caught: impure SPC normalize, CARS preflight CORS (proxied).
- Wave 2 (WP-04, 08, 09): **merged** 2026-10-10. Verifier caught: stale focus, eager off-screen TxDOT fetches.
- Wave 3 (WP-10): **merged** 2026-10-10. Orchestrator follow-up: collapsible wired on all panels; collapsed headers compacted.
- Wave 4 (WP-11…16): **merged** 2026-10-11.
  - Verifiers caught: impure SPC normalize (WP-13), an IndexedDB open-failure path that disabled outlines for the session (WP-14), and unguarded 12 h camera-list caching (WP-11).
  - The orchestrator review caught county-only zones dropping every Flood Watch (WP-14).
  - Live checks caught:
    - statements/advisories cluttering the outline layer (now Watch/Warning only);
    - a 10-state AOI table (no LA/MS for DIXIE);
    - PLAINS never pressing on wide maps;
    - the short-landscape top bar hiding controls.
  - Follow-ups:
    - back off when a GA/FL list walk keeps failing;
    - optional `status` slot on `StreamTile`, so ENDED/OFFLINE can sit in the caption (kit change + re-sync).
- Wave 5 (WP-17): **merged** 2026-10-11.
  - The verifier caught an unguarded Fullscreen API and focus that was never restored when the help closed.
  - Live checks caught: `[`/`]` ignored ENDED/OFFLINE feeds; cycling flipped between two feeds; the help rows were cramped at 390 px.
  - The "? KEYS" hint moved into the top bar (orchestrator call).

## Wave 6 (single-site radar) — planned 2026-10-11
Prep P6 (done): `MapLayer.defaultVisible` + LayerControl honours it (a layer can start off).

| WP | Title | Wave | Owns (exclusive) | Registry edits allowed |
|---|---|---|---|---|
| [18](packages/WP-18-single-site-velocity.md) | SRV velocity (nearest radar) + Open in WeatherWise | 6 | `src/sources/nexrad/**`, `src/map/velocity.ts` | `layers.ts`, `shortcuts.ts` V key + help row |

WeatherWise research (2026-10-11):
- It complements MapLibre; it doesn't replace it.
- There's no public API, its iframe is blocked by CSP, and its EULA restricts commercial use, so integration is a link-out only.
- The free gap we fill ourselves is SRV from IEM RIDGE.

## Waves 7–9 — outline (from the user's recurring-use brief and the INFLOW design handoff, 2026-10-11)
Live proofing used one area and one known event. These waves make INFLOW work for **any area, every day**. Packages are written when each wave is approved; research is in this session's reports, summarised here.

## Wave 7 (INFLOW design implementation): merged 2026-10-11 (Wave 6 / WP-18 merged the same day)
- **Verifiers caught:**
  - IndexedDB-style fallbacks were fine, but OTHER chips filled solid (WP-19);
  - an AOI subscription leak and an empty-tiles race (WP-18);
  - an unguarded Fullscreen API (WP-17).
- **Orchestrator review caught:**
  - NWS updates re-toasting under new ids, so `Alert.eventKey` (VTEC) was added (P7c);
  - YouTube live thumbnails are 5-min cached, so WP-23 got honest `THUMB ≤5m` labels.
- **Live checks caught:**
  - `base.css` emptied by the P7b split script (body margin, box-sizing and text helpers lost; every preset scrolled 24 px);
  - top-bar overflow hidden behind a scrollbar at ≤1366 px with a live threat button;
  - WALL at 1024 px overflowed 45 px;
  - CHASE squeezed alerts to 74 px;
  - a phone User-Agent broke /api/youtube (302 to m.youtube.com);
  - the kit importing app code (`src/lib/hazards.ts`), which broke `build:ui`. Event codes now live in `src/ui/hazard.ts`, and `build:ui` joins the merge gate.
- **Follow-ups:**
  - the toast's PDS badge is red outline, not white fill;
  - the threat button's accessible name should start with its visible text;
  - CHASE preset label vs manual collapse.
Prep (done):
- **P7a:** `Alert.damageThreat` + `Alert.pds`, plus `src/lib/hazards.ts` (codes, PDS/emergency, sort order, most severe TOR).
- **P7b:** one CSS file per kit component (`src/ui/css/*.css`).
- **ADR-0015:** INFLOW adopted; design-wave kit ownership allowed.

| WP | Title | Wave | Owns (exclusive) | Registry edits allowed |
|---|---|---|---|---|
| [19](packages/WP-19-alert-rows.md) | Alert rows + NWS feed-error state | 7 | kit AlertList/AlertRow + `css/alerts.css` + previews; `AlertsList.tsx`, `alertGeometry.ts` | — |
| [20](packages/WP-20-status-leds-data-age.md) | Shape LEDs + data age in headers | 7 | kit StatusLed, Panel + `css/led.css`, `css/panel.css` + previews; `panels/Panel.tsx`, `lib/feedStatus.ts` | — |
| [21](packages/WP-21-threat-button.md) | Top-bar threat button + WARNINGS HIDDEN | 7 | `ThreatButton.tsx`, `threat.ts`, `Topbar.tsx` | `LayerControl.ts` isLayerOn/subscribe |
| [22](packages/WP-22-map-styling.md) | Map casing, watches, focus, palettes | 7 | `MapPanel.tsx`, `mapStyle.ts`, paint in watchOutlines/spcWatches/spcOutlook/stormReports/spcMesoscale | — |
| [23](packages/WP-23-stream-snapshots.md) | Snapshot thumbnails + ▲ promote | 7 | kit StreamTile + `css/stream.css` + preview; `StreamsGrid.tsx`, `sources/streams/**` | — |
| [24](packages/WP-24-tor-toasts.md) | New-TOR toasts | 7 | new kit Toast + `css/toast.css` + preview; `ToastRegion.tsx`, `newAlerts.ts` | `App.tsx` mount |
| [25](packages/WP-25-layout-presets.md) | data-preset layouts + splitter grips | 7 | `App.tsx`, `index.css` layout, `layout.ts`, `Splitter.tsx`, `LayoutMenu.tsx` | — |

Expected conflicts:
- `App.tsx`: the WP-24 mount inside the WP-25 rewrite;
- the `index.ts` / `styles.css` lines for the new Toast, added by the orchestrator.

After merge: update the kit previews where builders didn't, then re-sync Claude Design.

## Wave 13 (pre-launch polish): in progress 2026-10-17
From the four-reviewer UX pass (`docs/polish-plan.md`). The repo was renamed to `inflow` first (ADR-0021).

| WP | Title | Wave | Owns (exclusive) | Registry edits allowed |
|---|---|---|---|---|
| [50](packages/WP-50-quiet-day-trust.md) | Quiet-day trust and empty states | 13 | `AlertsList.tsx`, `alertGeometry.ts`, `StreamsGrid.tsx`, `FeedsQuiet.tsx`, `AudioPanel.tsx`, `openmhz/systems.ts` | — |
| 51 | Narrow and tablet layout | 13 | orchestrator: `src/index.css`, `src/ui/css/*` except `led.css`, `MapPanel.tsx`, `App.tsx` | — |
| [52](packages/WP-52-first-run.md) | START HERE, layout hints, PLAINS pressed | 13 | `HelpDialog.tsx`, `StartHereTab.tsx`, `help.css`, `LayoutMenu.tsx`, `TopbarMore.tsx`, `aoiPresetData.ts` | — |
| [53](packages/WP-53-copy-pass.md) | Copy and consistency pass | 13 | orchestrator (done in prep) | — |
| [54](packages/WP-54-delight.md) | Warning-aware title/favicon; LED power-on | 13 | `useWarningTitle.ts`, `warningTitle.ts`, `led.css` | `Topbar.tsx` one line |

There's no file overlap.

## Wave 12 (1.0 usability): merged 2026-10-17
User asks (2026-10-17): anyone must be able to add a chaser after release without a rebuild, and the self-run path must work for non-technical users.
Prep (done, on `main`):
- `src/state/myChasers.ts` (per-browser user chasers, validated, capped at 100);
- the `/api/youtube` route sends the `SOCS=CAI` consent-reject cookie (UK/EU channel pages 302 to a consent wall without it).

| WP | Title | Wave | Owns (exclusive) | Registry edits allowed |
|---|---|---|---|---|
| [48](packages/WP-48-add-your-own-chasers.md) | Add your own chasers | 12 | `resolveChannel.ts`, `allChasers.ts`, `MyChasers.tsx`, `scheduler.ts`, `useRoster.ts` | `StreamsGrid.tsx`, `LiveNow.tsx` |
| [49](packages/WP-49-easy-start.md) | Double-click start | 12 | `server/index.ts`, `listen.ts`, `openBrowser.ts`, `launchers/`, `release.yml` zip step, `scripts/start.mjs` | — |

There's no file overlap.

## Wave 11 (ship 1.0, launch-plan §2): merged 2026-10-17
Prep (done, on `main`):
- `proxy/routes.ts` is the one route table (methods + cache TTL per route); Vite reads it. `NWS_CONTACT` sets the NWS User-Agent contact.
- `config/streams.json`: five national `channelId` entries, re-verified on their `/streams` pages 2026-10-17. Default AOI is the Plains.
- `src/panels/help/about.ts` (disclaimer, data terms, credits; never edit in packages); glossary `NOAA`, `IEM`, `HF`, `API`, `ODbL`, `MIT`; `__APP_VERSION__`; `build:server` / `start` / `serve` scripts; `engines.node >= 20`.

| WP | Title | Wave | Owns (exclusive) | Registry edits allowed |
|---|---|---|---|---|
| [45](packages/WP-45-production-server.md) | Production server | 11 | `server/**` | — |
| [46](packages/WP-46-packaging-ci.md) | `npm start`, Docker, CI, release | 11 | `scripts/start.mjs`, `Dockerfile`, `.dockerignore`, `.github/**`, `SECURITY.md`, `CONTRIBUTING.md` | — |
| [47](packages/WP-47-about-tab.md) | ABOUT tab in `? HELP` | 11 | `src/panels/help/AboutTab.tsx`, `HelpDialog.tsx`, `help.css` (+ tests) | — |

There's no file overlap. Merge 45 first, then 46 (its Docker build needs `server/`), then 47.

## Wave 10 (polish): merged 2026-10-17
- **Orchestrator review caught (WP-44):**
  - the MORE button set `aria-pressed` on a disclosure (now `aria-expanded` only);
  - the popover anchored `right: 0` could clip at 390 px (now fixed-position and clamped).
- **Verifiers caught:**
  - no test exercised the WP-41 in-flight guard (added; mutation-checked);
  - MORE stayed "open" after widening past 900 px (fixed: it closes on resize).
- **Live check:**
  - the matrix passes at all 7 sizes with no horizontal scroll;
  - 768×1024 bar is 2 rows, 72 px (was 3 rows, 100 px);
  - 390×844 is still 5 rows, 134 px (brand / AOI / threat+SPC / presets+MORE / UTC), so the package's 2-row target is not met at phone width;
  - above 900 px it is unchanged.
- **Follow-ups (minor):**
  - the nested NOTIFY popover overlaps the MORE list at ≤ 900 px; it works, but it's not anchored to MORE;
  - focus leaving MORE with Tab doesn't close it;
  - the `?` key opens help while MORE stays open underneath;
  - phone-width top bar rows (above), which needs a design call (e.g. hide the brand word, or move UTC into MORE).

Prep (done, on `main`):
- glossary tips for the D4–8 empty-day labels (SPC wording);
- the stale outlook `aria-busy` flag cleared on switching back to the loaded day.
- Dropped: the HWO fixture trim (already ~2 KB with a realistic header) and the CHASE label (intentional).

| WP | Title | Wave | Owns (exclusive) | Registry edits allowed |
|---|---|---|---|---|
| [41](packages/WP-41-roster-visible-rearm.md) | Roster scheduler re-arms on visible | 10 | `src/sources/chasers/scheduler.ts`, `useRoster.ts` | — |
| [42](packages/WP-42-audio-panel-polish.md) | Audio LED + duplicate system names | 10 | `AudioPanel.tsx`, `src/sources/openmhz/systems.ts` | — |
| [43](packages/WP-43-notify-permission-reread.md) | NotifyControl re-reads permission | 10 | `src/notify/NotifyControl.tsx` | — |
| [44](packages/WP-44-topbar-more-menu.md) | Top bar ≡ MORE menu at ≤ 900 px | 10 | `TopbarMore.tsx`, `topbar-more.css` | `Topbar.tsx` one wrap |

There's no file overlap. Merge in any order; 44 goes last because of the live matrix check.

## Wave 9 (notifications, chasers, help): merged 2026-10-11
- **Verifiers caught:**
  - the narrow-tier `.panel-body` 320 px cap boxing the new help dialog on phones (WP-40);
  - two differing descriptions per AOI preset (WP-39, now glossary-only).
- **Orchestrator review caught:**
  - an HWO "SPOTTERS: NOT NEEDED" guess when the text has no spotter sentence (now omitted);
  - the kit Panel title being used as a string in aria-labels, so tips come from `TaggedText` instead of widening the prop.
- **Live check:**
  - matrix passes at all 7 sizes (top bar one row at 1366 and up with NOTIFY);
  - 113 tagged terms, all with tips;
  - HWO live from FFC; the default AOI centre is in CHS (no HWO in the API), so no strip shows there, correctly;
  - help: 3 columns at 1920, 1 column on a phone, search works (an earlier "broken search" was a scripted-input artefact).
- **Needs a visible browser** (the pane was hidden): the D1–D8 map change, and a real background-tab notification (the permission prompt is the user's).
- **Follow-ups (minor):**
  - the roster scheduler can lag up to 60 s after the tab becomes visible;
  - HWO fixtures still carry the county lists;
  - the panel LED ignores OpenMHz list errors (from Wave 8);
  - the tablet-portrait top bar is now 3 rows (95 px).


Research was re-verified on 2026-10-11 (roster channel IDs on their own `/streams` pages, HWO coverage, the Spotter Network map URL, the Notification API, SPC issuance). Facts are in each package.

Prep (done, on `main`):
- **P9a ([ADR-0018](adr/0018-acronym-expansions.md)):** kit `Abbr` + `glossary.ts`; kit components tag their own acronyms; top bar AOI/UTC/LOCAL; `? HELP` (shown on touch too) lists the glossary.
- **P9b ([ADR-0019](adr/0019-browser-notifications.md)):** `src/state/notify.ts` bus.
- **P9c:** `src/panels/help/chaserTerms.ts`, 78 chaser terms in 5 groups (orchestrator-written).
- **P9d:** `config/chasers.json`, 58 verified channels (54 chasers + 4 coverage outlets).
  - About 30 candidates were dropped: no streams, inactive, not US, impostor handles or unverifiable.
- Not changed: the WALL/CHASE label (intentional).

| WP | Title | Wave | Owns (exclusive) | Registry edits allowed |
|---|---|---|---|---|
| [35](packages/WP-35-notification-engine.md) | Notification engine + NWS/SPC triggers | 9 | `src/notify/**` | `Topbar.tsx` one element, `App.tsx` one mount |
| [36](packages/WP-36-chaser-roster-live-now.md) | Chaser roster, LIVE NOW, went-live, SN link-out | 9 | `src/sources/chasers/**`, `StreamsGrid.tsx`, `LiveNow.tsx` | — |
| [37](packages/WP-37-hazardous-weather-outlook.md) | Hazardous Weather Outlook strip | 9 | `src/sources/nws/hwo.ts`, `HwoStrip.tsx`, AlertsList acronym tags | `AlertsList.tsx` one element |
| [38](packages/WP-38-spc-day-selector-clarity.md) | SPC day selector you can see working | 9 | `OutlookDayControl.ts`, `spcOutlook.ts`, `outlookDay.ts`, `sources/spc/outlook.ts`, `OutlookRisk.tsx`, `spcRisk.ts` | — |
| [39](packages/WP-39-acronym-tips-app.md) | Acronym tips across the rest of the app | 9 | acronym tags in ThreatButton, AudioPanel, CamerasPanel, AoiPresets, LayerControl, velocity | — (glossary additions reported to the orchestrator) |
| [40](packages/WP-40-help-redesign.md) | Help redesign: tabs, search, chaser terms grid | 9 | help dialog in `KeyboardShortcuts.tsx` → `src/panels/help/**` | — |

Expected conflicts: `Topbar.tsx` (WP-35 only, since the prep already touched it). There's no other overlap.

Merge order: 38, 37, 39, 40, 36, then 35 (35 delivers 36's events). After merging: add the glossary terms reported by WP-39; run the full ADR-0014 matrix; re-sync Claude Design (Abbr + tips in 5 components).

## Wave 8 (any area): merged 2026-10-11
- **Verifiers caught:** an always-mounted empty live region leaving a 24 px gap in the top bar (WP-26).
- **Orchestrator review caught:**
  - a Windows case clash I wrote into WP-31 (`OutlookRisk.tsx` / `outlookRisk.ts`, now `spcRisk.ts`);
  - a GOES credit that couldn't follow the sector (now one sector-neutral credit);
  - New England 511 records carry an exact `areaId` (used before `stateAt`).
- **Live checks caught:**
  - the top bar wrapped to two rows at 1920 with a live TOR (one AOI item now carries the AOI time; zone clocks show HH:MM);
  - the AOI label led with far states alphabetically (now nearest first);
  - the 3-tile stream cap silently stopping feeds (user report: no cap now, ADR-0017 amended);
  - the OutlookDayControl head had no `:focus-visible` style (it now uses `layer-ctrl-head`).
- **Viewport matrix:** passes at all 7 sizes (no page scroll, map on the first screen, 28 px touch buttons).
- **Closed after merge:** the user confirmed the map controls and the WeatherWise link take real clicks; Claude Design re-synced (StreamTile + Badge, 9 components).
- **Still open:** D4–8 render and the D1→D3 switch on a live map.
- **Follow-ups (minor, from verifiers):**
  - OutlookRisk refetches 3 SPC files on every pan (query key includes the bbox);
  - the panel LED ignores OpenMHz list errors;
  - two OpenMHz systems share the name "Alabama Interoperable Radio System".
Endpoints were re-verified on 2026-10-11 by curl, plus the browser pane for OpenMHz. The facts are in each package and in the ADR-0004 corrections.

Prep (done, on `main`):
- **P8a:** 52-code AOI states from simplified Census shapes, `stateAt`, `src/lib/geo.ts` ([ADR-0016](adr/0016-nationwide-aoi-states.md)); the top bar caps the AOI label at 6 codes.
- **P8b:** `SourceAdapter.background` → `refetchIntervalInBackground` (for Wave 9).
- **P8c:**
  - `CAMERA_SOURCES { adapter, states, attribution }` replaces `CAMERA_ADAPTERS`; the coverage and footer texts are derived from it;
  - proxy routes for 3 CARS and 8 IBI sites.
- **P8d (user reports):**
  - map controls get `maplibregl-ctrl`, so the WeatherWise link and the Layers toggle take clicks (the corner containers are `pointer-events: none`);
  - the Toast PDS badge is white-filled (HANDOFF §2).
- Not changed: the WALL/CHASE label after a manual collapse is intentional (see the comment in `layout.ts`).

| WP | Title | Wave | Owns (exclusive) | Registry edits allowed |
|---|---|---|---|---|
| [26](packages/WP-26-aoi-alert-matching.md) | Alerts match the AOI by polygon + threat-button a11y | 8 | `aoiMatch.ts`, `AlertsList.tsx`, `threat.ts`, `ThreatButton.tsx`, `threat.css`, `newAlerts.ts`, `ToastRegion.tsx` (+ tests) | — |
| [27](packages/WP-27-openmhz-any-area.md) | OpenMHz systems for any area | 8 | `src/sources/openmhz/**`, `AudioPanel.tsx`, `config/audio.json` (delete) | — |
| [28](packages/WP-28-cameras-cars-ia-mn-in.md) | Cameras IA/MN/IN (CARS) | 8 | `src/sources/cars/**` | `CAMERA_SOURCES` +3 |
| [29](packages/WP-29-cameras-ibi511-more.md) | Cameras AZ/ID/AK/LA/CT/NV/PA/New England (IBI) + walk back-off | 8 | `src/sources/ibi511/**` | `CAMERA_SOURCES` +8 |
| [30](packages/WP-30-cameras-wa-ca.md) | Cameras WA (WSDOT) + CA (Caltrans) | 8 | `src/sources/wsdot/**`, `src/sources/caltrans/**` | `CAMERA_SOURCES` +2 |
| [31](packages/WP-31-spc-outlook-days.md) | SPC outlook D1–8 + AOI risk | 8 | `sources/spc/outlook.ts`, `map/spcOutlook.ts`, `map/outlookDay.ts`, `map/OutlookDayControl.ts`, `panels/OutlookRisk.tsx`, `panels/outlookRisk.ts` | `MapPanel.tsx` addControl line, `Topbar.tsx` one element |
| [32](packages/WP-32-goes-west.md) | GOES-West for western AOIs | 8 | `map/satellite.ts`, `sources/satellite/**` | — |
| [33](packages/WP-33-stream-tile-play.md) | Play thumbnails in place (ADR-0017) | 8 | kit `StreamTile` + `css/stream.css` + preview; `StreamsGrid.tsx`, `sources/streams/playing.ts` | — |
| [34](packages/WP-34-aoi-clock.md) | AOI local time in the top bar | 8 | `sources/nws/points.ts`, `panels/clock.ts`, Topbar clock items | — |

Expected conflicts (trivial):
- `CAMERA_SOURCES` appends (WP-28, 29, 30);
- `Topbar.tsx` (WP-31 one element vs WP-34 clock items).

Merge order: 26, 27, 32, 28, 29, 30, then 31, 34, 33. After merging: the full ADR-0014 matrix, then re-sync Claude Design (StreamTile, Badge).

**Wave 7: INFLOW design implementation** (`docs/design/inflow-v1/HANDOFF.md` §9). D0 (tokens, fonts, brand) is done.
- Orchestrator prep:
  - split `src/ui/styles.css` into per-component files, so builders can own kit components without conflicts (kit-css.mjs inlines them for the design sync);
  - `data-preset` layout grid driven by the layout store;
  - update ADR-0010 to allow per-component kit ownership in design waves.
- Packages:
  - **AlertRow:** hazard chip, PDS badge, remaining-time bar, 60 s expired state, PDS → TOR → SVR… sort order.
  - **StatusLed:** shape-coded LEDs plus data age in every panel header.
  - **Top bar:** threat button, "WARNINGS HIDDEN" chip, and the NWS feed-error banner.
  - **Map styling:** a separate watches layer, a casing pass, the hazard palette (FFW needs its light casing), the focus reticle, labels above radar.
  - **Stream thumbnails:** snapshot images refreshed every 15 s with ▲ promote; only the primary plays live. This also cuts CPU.
  - **Toast region:** NWS TOR/TOR-E only; Wave 9 reuses it.
- Re-sync Claude Design after.

**Wave 8: any area.**
- Prep:
  - 50-state + DC + PR table (today 20 states, so over IL/OH/MN/PA/the West the AOI has no states and alerts/cameras go blank);
  - `useSource` background-polling flag.
- Packages:
  - **AOI filtering:** alerts also match by polygon/bbox, not only by state.
  - **OpenMHz for any area:** fetch `api.openmhz.com/systems` from the browser (463 systems, 41 states) and drop the curated map. GA/SC currently has none, although 12 exist.
  - **DOT cameras A:** CARS IA/MN/IN through the existing factory + proxies.
  - **DOT cameras B:** IBI AZ/ID/LA/PA/NV/CT/New England/AK through the `ibi511` factory; WA and CA are direct.
  - **SPC Day 1–3 (+4–8) outlooks:** a layer with a day selector, plus an AOI-risk badge.
  - **GOES-West** for AOIs west of about 105°W.

**Wave 9: notifications and chasers.**
- **Notification engine:**
  - browser Notification API, permission asked only from a click;
  - pure diff with de-dupe by id, seeded on load, a severity/event threshold, a rate cap, and `tag` replacement;
  - triggers: new NWS alert in the AOI, new SPC watch or MD, and an SPC risk upgrade for the AOI ("upcoming storms").
- **Chaser roster + LIVE NOW:**
  - about 40–60 regular chasers by channelId, each with a home region;
  - slow round-robin liveness (ADR-0013), a live-first sort, and a "chaser went live" trigger.
- **Hazardous Weather Outlook** for the AOI's forecast office (NWS `/points` → CWA → HWO).
- **Chaser positions on the map** (user idea, researched 2026-10-11).
  - Spotter Network is the only source. Its feeds (`/feeds/gr.txt`, `/feeds/rss-positions.xml`) are keyless and CORS `*`.
  - Its terms are personal and non-commercial only, and forbid displaying the data, so redrawing positions needs written permission.
  - The feeds also carry phone numbers and emails.
  - v1 can only offer an "SN MAP ↗" link-out (Wave 9).
  - With an agreement (v2/v4):
    - a Worker `/api/sn` strips PII and filters to the roster;
    - a `chaser-positions` layer joins the roster by verified SN `public_id`;
    - staleness tiers: live under 5 min, dimmed to 20, ghosted to 60, then hidden;
    - each map marker links to its stream tile.
  - **Pin a chaser on the map** (user, 2026-10-11): from a stream tile, pin that chaser's position as a map marker that follows them, so stream and location sit side by side. It depends on the position source above:
    - with SN permission, the pin is the roster join;
    - without it, nothing is drawn (no guessed or scraped positions), and the tile offers only the SN MAP ↗ link-out.

**Needs the v2 Worker:**
- push notifications while the tab is closed (cron poller + Web Push);
- YouTube Data API live discovery (replaces the `/api/youtube` scraping, ADR-0013);
- shared upstream caching.

## Wave 4 (v1.1 coverage polish)

Sources were curl-verified on 2026-10-10 (endpoints, CORS for the real method, keys). Facts are in each package.

**Orchestrator prep, before launch** (shared files, one commit each, then `git push origin main`). All done 2026-10-11:
- **P0 tech debt (candidate I):**
  - `Splitter.tsx`/`ConsoleSplitter`: clear `body.resizing` on unmount mid-drag and handle `lostpointercapture`.
  - Throttle layout `localStorage` writes during a drag (`src/state/layout.ts`).
  - AudioPanel inline-styled buttons → `ConsoleButton`.
- **P1:** `Alert.zones: string[]` (NWS `affectedZones` URLs) in `src/types/index.ts`, plus the `src/sources/nws/alerts.ts` normalize and its test (for WP-14).
- **P2:** `useAoi` gains `aoiRequest: { bbox, seq } | null`, `requestAoi(bbox)` and `clearAoiRequest()` (for WP-16).
- **P4, responsive tiers (ADR-0014):**
  - viewport-capped tracks, `100dvh`, safe areas;
  - mid-width, short-landscape and wall tiers;
  - touch targets;
  - layer control collapsed by default on small screens.
- ADR-0013 (stream liveness) accepted 2026-10-11.
- After the merge, re-sync Claude Design: P0/P4 changed `src/ui/styles.css` (link-out buttons, touch targets).

```
Prep P0–P2, P4 (orchestrator) → push main
        ▼
Wave 4 (6 builders in parallel, + 1 verifier each)
  WP-11 GA + FL cameras (IBI 511)     ── src/sources/ibi511, proxy /api/511ga + /api/fl511
  WP-12 SC cameras (511SC Iteris)     ── src/sources/sc511,  proxy /api/511sc
  WP-13 SPC MDs + watch boxes (IEM)   ── src/sources/iemspc, 2 map layers
  WP-14 Watch outlines (NWS zones)    ── src/sources/nwszones, 1 map layer, IndexedDB
  WP-15 Stream lifecycle (ADR-0013)   ── src/sources/streams, StreamsGrid, proxy /api/youtube
  WP-16 AOI presets                   ── Topbar control + MapPanel effect
        ▼
Merge: resolve registry one-liners; update CamerasPanel NO_COVERAGE text to "KS · NE · TX · GA · SC · FL"
Prep P3: primary stream → src/state/streams.ts; LayerControl toggle API
        ▼
Wave 5
  WP-17 Wall-display keyboard shortcuts
```

| WP | Title | Wave | Owns (exclusive) | Registry edits allowed |
|---|---|---|---|---|
| [11](packages/WP-11-cameras-ibi511.md) | GA + FL cameras (IBI 511) | 4 | `src/sources/ibi511/**` | `CAMERA_ADAPTERS`, `vite.config.ts` 2 proxy entries |
| [12](packages/WP-12-cameras-sc511.md) | SC cameras (511SC) | 4 | `src/sources/sc511/**` | `CAMERA_ADAPTERS`, `vite.config.ts` proxy entry |
| [13](packages/WP-13-spc-mds-watches.md) | SPC MDs + watch boxes | 4 | `src/sources/iemspc/**`, `src/map/spcMesoscale.ts`, `src/map/spcWatches.ts` | `src/map/layers.ts` |
| [14](packages/WP-14-watch-outlines.md) | Watch outlines | 4 | `src/sources/nwszones/**`, `src/map/watchOutlines.ts` | `src/map/layers.ts` |
| [15](packages/WP-15-stream-lifecycle.md) | Stream lifecycle | 4 | `src/sources/streams/**`, `src/panels/StreamsGrid.tsx`, `config/streams.json` | `vite.config.ts` proxy entry |
| [16](packages/WP-16-aoi-presets.md) | AOI presets | 4 | `src/panels/AoiPresets.tsx`, `src/panels/aoiPresetData.ts` (+test) | `Topbar.tsx` one line, `MapPanel.tsx` one effect |
| [17](packages/WP-17-wall-shortcuts.md) | Wall-display shortcuts | 5 | `src/panels/KeyboardShortcuts.tsx`, `src/panels/shortcuts.ts` (+test) | `App.tsx` mount |

**Expected merge conflicts (trivial):**
- `CAMERA_ADAPTERS` (WP-11, WP-12);
- `vite.config.ts` proxy table (WP-11, 12, 15);
- `layers.ts` array (WP-13, 14). Final order: `satellite, spcOutlook, radar, watchOutlines, spcMesoscale, spcWatches, stormReports`.

**Deferred:**
- Alabama ALGO cameras: the Incapsula bot wall blocks every request; we won't work around bot detection.
- Oklahoma cameras: still unverifiable from the UK.
- Terms for 511GA, 511SC and FL511 are UNVERIFIED (no terms pages found). They go on the v2 terms-gate list.

## Waves

```
Wave 1 (parallel, no file overlap)
  WP-01 SPC outlook + storm reports   ── map layers
  WP-02 Radar loop / timeline          ── map layer (radar.ts)
  WP-03 GOES satellite layer           ── map layer
  WP-05 Streams grid UX                ── StreamsGrid
  WP-06 Audio panel (OpenMHz + KiwiSDR)── new panel
  WP-07 DOT cameras KS/NE (CARS)       ── new panel
        │
  Orchestrator merge + prep: add `focus` to AOI store (for WP-04)
        ▼
Wave 2 (parallel)
  WP-04 Alert interaction              ── AlertsList, MapPanel
  WP-08 TxDOT cameras via proxy        ── extends WP-07
  WP-09 Layer toggle control           ── needs Wave 1 layers
        ▼
Wave 3
  WP-10 Layout customization           ── layout store, console split, presets
```

| WP | Title | Wave | Owns (exclusive) | Registry edits allowed |
|---|---|---|---|---|
| [01](packages/WP-01-spc.md) | SPC outlook + storm reports | 1 | `src/sources/spc/**`, `src/map/spcOutlook.ts`, `src/map/stormReports.ts` | `src/map/layers.ts` |
| [02](packages/WP-02-radar-loop.md) | Radar loop / timeline | 1 | `src/map/radar.ts`, `src/map/radarLoop.ts`, `src/sources/radar/**` | — |
| [03](packages/WP-03-satellite.md) | GOES satellite layer | 1 | `src/map/satellite.ts`, `src/sources/satellite/**` | `src/map/layers.ts` |
| [04](packages/WP-04-alert-interaction.md) | Alert interaction | 2 | `src/panels/AlertsList.tsx`, `src/panels/MapPanel.tsx` | — |
| [05](packages/WP-05-streams-ux.md) | Streams grid UX | 1 | `src/panels/StreamsGrid.tsx`, `src/sources/streams/**` | `config/streams.json` (append) |
| [06](packages/WP-06-audio.md) | Audio panel | 1 | `src/sources/openmhz/**`, `src/sources/kiwisdr/**`, `src/panels/AudioPanel.tsx`, `config/audio.json` | `App.tsx` placeholder swap, `vite.config.ts` proxy entry |
| [07](packages/WP-07-cameras-cars.md) | DOT cameras KS/NE | 1 | `src/sources/cars/**`, `src/panels/CamerasPanel.tsx` | `App.tsx` placeholder swap |
| [08](packages/WP-08-cameras-txdot.md) | TxDOT cameras | 2 | `src/sources/txdot/**` | `CamerasPanel.tsx` adapter list, `vite.config.ts` proxy entry |
| [10](packages/WP-10-layout-customization.md) | Layout customization | 3 | `src/state/layout.ts`, `src/panels/Splitter.tsx`, `src/panels/LayoutMenu.tsx` | `App.tsx`, `Topbar.tsx`, `Panel.tsx` (optional prop), layout CSS |
| [09](packages/WP-09-layer-control.md) | Layer toggle control | 2 | `src/map/LayerControl.ts` | `MapPanel.tsx` one line (`addControl`) |

## Running a wave (orchestrator)

1. Ensure `main` is green: `npm run typecheck && npm run lint && npm test` — then **`git push origin main`**. Agent worktrees are cut from `origin/main`, not local `main`; an unpushed main gives builders a stale base (happened in Wave 2).
2. Launch one `wp-builder` per package **in a single message** so they run concurrently, each with `isolation: "worktree"`. Prompt: `Build docs/packages/WP-NN-*.md`.
3. As each returns, launch a `wp-verifier` on its branch. FAIL → resume the builder (SendMessage) with the verifier's findings.
4. Merge PASS branches into `main` one at a time; resolve registry one-liners; re-run checks after each merge.
5. Run the app (`.claude/launch.json` → `dev`) and check every panel against live data for the current AOI.
   Then check the **viewport matrix** (ADR-0014) with the browser pane's `resize_window`: 1920×1080, 1366×768, 1024×768, 768×1024, 390×844, 844×390, 3840×2160. At each size:
   - no horizontal page scroll;
   - the map is visible on the first screen;
   - every control is reachable without hover.
6. Apply any "requested shared changes" builders reported, then start the next wave.

Builders that need a shared-file change (types, store, tokens, package.json) **stop and report** it; they do not make it.
