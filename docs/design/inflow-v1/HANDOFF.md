# Handoff: INFLOW v1 — design system + console screens

## Overview
INFLOW (working name was "Storm Chasers") is a single-screen, mission-control dashboard for following live US severe weather around one **area of interest (AOI)**. Every panel filters to that AOI: NEXRAD radar, NWS alerts, chaser livestreams, scanner/ham/CB radio, DOT cameras, SPC outlooks/reports, GOES satellite.

This handoff replaces the app's **provisional dark theme** with a deliberate system: a re-branded, tokenised palette, type, spacing, component specs and layout presets. **The app already exists and works. Do not restructure it.** The job is mainly to:
1. Drop in `tokens.css`. Legacy variable names are aliased, so step one is a value swap.
2. Apply the component specs and the new markup listed in §9.
3. Add the `data-preset` layout system (DEFAULT / WALL / CHASE / mobile).

## About the design files
Everything in this folder is a **design reference built in HTML**: prototypes showing intended look and behaviour, not production code. Recreate them in the existing React app using its current components, state and data layer. `*.dc.html` files use a small in-house template runtime (`support.js`) that exists only to render the mocks. **Do not port it.**

- Open `Inflow System.dc.html` in a browser. It is the full spec, with live screens embedded in §07.
- `Console.dc.html` is the screen mock. Its props are `preset` (`default|wall|chase|mobile`), `scenario` (`active|outbreak|quiet|degraded`), `w` and `h`. Its logic class holds realistic sample data and the exact state rules (sorting, countdown colouring, focus, LED mapping). Read it as executable spec.
- `tokens.css` / `tokens.json` are **production-ready**. Ship `tokens.css` as-is; `tokens.json` is the same data for any tooling.

## Fidelity
**High-fidelity.** Colours, type, spacing, states, motion and copy are final for v1. Imagery is placeholder: radar, satellite and SPC fills are a synthetic CSS test pattern, and video/camera tiles are striped stand-ins. Use the real data layers.

---

## 1. Brand
- **Name:** INFLOW. Avoid "Storm Chasers": it's a Discovery series name. **A trademark clearance search is still pending.**
- **Wordmark:** `INFLOW`, IBM Plex Sans Condensed 700, uppercase, letter-spacing `0.16em`, colour `--text-bright` `#F2F5F7`.
- **Mark (AOI reticle), 16×16 grid:**
  ```html
  <svg viewBox="0 0 16 16" fill="none"><path d="M1 5V1h4M11 1h4v4M15 11v4h-4M5 15H1v-4" stroke="#8DC5EE" stroke-width="2"/><rect x="6" y="6" width="4" height="4" fill="#F2F5F7"/></svg>
  ```
  As a favicon it always sits on a `#0D1115` tile. Mark gap to wordmark: 8 px. Under 120 px wide, use the mark alone.
- **Chosen direction: 1a INSTRUMENT** (`Inflow Brand Directions.dc.html`, the option marked CHOSEN). 1b and 1c are rejected explorations; don't implement them.
- **App icon:** a 1024 master with a #0D1115 field, the mark at 54% width centred, OS-standard corner radius, and a 1 px #33404B keyline on light OS backgrounds only. **Reversed lockup** (light surfaces, print): mark brackets #3F6F92, core #0D1115, wordmark #0D1115 on #F2F5F7.
- **Marketing hero:** two columns. On the left (420 px): the lockup at the top, then the eyebrow `SEVERE WEATHER CONSOLE` (Sans 600 12 px, 0.08em, #8E9AA5), the headline "One area. Every feed." (Sans 600 58/58, #F2F5F7), the body (17/1.5, #B8C1C9), a primary `⌖ OPEN CONSOLE` and a quiet `SEE A LIVE OUTBREAK ↗`, and a live status line in Mono 12 px. On the right: a real screenshot of the OUTBREAK state, 1 px #33404B border plus a 6 px #0D1115 outline, bleeding off the right edge. The product is always the hero; no photography.
- **Never** use NOAA/NWS logos or seals, or TV-network styling. Never render the brand in a hazard colour, animate it, or put it on the map. Never brand anything "INFLOW Alerts/Warnings".
- **Voice:** short, factual, present tense, times in Z. Console labels are UPPERCASE nouns with no punctuation. Body copy is sentence case. No exclamation marks or emoji. Never use "alert/watch/warning" for non-NWS signals; a chaser item is a "report", and an unconfirmed one says so. Empty state = LABEL + one sentence + at most one action, e.g. `NO SCANNER SYSTEMS IN AOI`.

## 2. Colour: three semantics, no shared swatch
Principles: **(P1)** only hazards are saturated; **(P2)** form before colour; **(P3)** one AOI, one focus, one accent.

### Primitives (`--p-*`)
| graphite | hex | | ice | hex |
|---|---|---|---|---|
| 1000 | #040608 | | 200 | #CFE6F8 |
| 950 | #080B0E | | 400 | #8DC5EE |
| 900 | #0D1115 | | 600 | #3F6F92 |
| 850 | #12171C | | 800 | #1A3247 |
| 800 | #182027 | | 900 | #11202D |
| 700 | #232C35 | | **instrument** | |
| 600 | #33404B | | phosphor-300 | #BFEBD5 |
| 500 | #5E6B78 | | sand-300 | #D8C38E |
| 400 | #75818D | | rose-300 | #E7A9A9 |
| 300 | #8E9AA5 | | | |
| 200 | #B8C1C9 | | | |
| 100 | #DDE3E8 | | | |
| 50 | #F2F5F7 | | | |

NWS hazard colours (from the hazards map legend): TOR `#FF0000`, SVR `#FFA500`, FFW `#8B0000`, TOA `#FFFF00`, SVA `#DB7093`, SPS `#FFE4B5`.
SPC categorical: TSTM `#C1E9C1`, MRGL `#66A366`, SLGT `#FFE066`, ENH `#FFA366`, MDT `#E06666`, HIGH `#EE99EE`.
Storm reports: tornado `#FF4040`, wind `#3D7DFF`, hail `#2DB84A`.

### Semantic tokens (use only these in components)
- **Surfaces:** `--surface-app` 950 · `--surface-panel` 900 · `--surface-head` 850 · `--surface-raised` 800 (hover, overlays) · `--surface-inset` 1000 (fields, media wells) · `--surface-scrim` `rgba(4,6,8,.78)` (anything sitting on the map; no blur).
- **Text:** `--text-bright` 50 · `--text-primary` 100 · `--text-secondary` 200 · `--text-muted` 300 · `--text-disabled` 500 · `--ink-dark` `#050709` (on light fills) · `--ink-light` `#FFFFFF`.
- **Borders:** `--border-default` 700 (dividers) · `--border-strong` 600 · `--border-control` 500 (control edges, 3.5:1).
- **Accent / focus:** `--accent` ice-400 · `--accent-strong` ice-200 (hover) · `--accent-line` ice-600 (link-out borders) · `--accent-fill` ice-900 (selected bg) · `--focus-ring` ice-200.
- **Feed status:** live ● `--status-live` phosphor · loading ◌ graphite-300 · stale ◐ sand · error ■ rose · offline ○ graphite-500.
- **Hazard:** `--hz-tor|svr|ffw|toa|sva|sps`. Ink: dark on all except FFW (white). `--hz-tor-text` `#FF5C5C` (countdown under 10 min, on panels). `--hz-pds-mark` `#F2F5F7`.
- **Badges:** AOI bg `#232C35`/fg `#F2F5F7` · CTX fg `#8E9AA5` (no bg) · ZONE bg `#182027`/fg `#B8C1C9` · PDS bg `#F2F5F7`/fg `#050709`.
- **Map:** basemap `#0A0E12` · water `#06090C` · boundary `#2A343E` · road `#161D24` (CHASE roads `#3A4856`/`#2C3946`) · label `#C3CDD6` with a 2 px `#040608` halo · focus ice-200 · casing `#040608` · opacities: radar `.78`, sat `.5`, SPC fill `.16`, focus fill `.14`, PDS hatch `.24`, dim others `.55`.

**Accent decision:** Ice `#8DC5EE`. Rejected: the current cyan (collides with 5–15 dBZ), amber (SVR/TOA), violet (SVA, IR cold tops, SPC HIGH), mint (radar green). On the map, Ice is only ever a stroke or bracket, never a fill.

**Contrast:** every text pair passes WCAG 2.2 AA at 4.5:1, and UI parts pass at 3:1. The live table in spec §02 is computed from the hex values. Rules that fall out of it:
- Text on the map scrim uses `--text-secondary`, never `--text-muted`, which fails over yellow cores.
- The FFW maroon stroke gets a light casing `rgba(242,245,247,.6)`.
- Hazard chips use ink-dark text, except FFW, which uses white.

**Colour-blind support:** Machado-2009 simulation is in spec §02. Every pair that converges is told apart by glyph or line style.

## 3. Typography
- `--font-ui`: **IBM Plex Sans Condensed** 400/500/600/700, falling back to "Segoe UI", system-ui.
- `--font-data`: **IBM Plex Mono** 400/500/600, falling back to "Cascadia Mono", Consolas, ui-monospace. Use it for all codes, clocks, counts, countdowns and handles.
- Google Fonts import is at the top of `tokens.css`.
- Every changing number uses `font-variant-numeric: tabular-nums slashed-zero` (`.tnum` / `[data-tnum]`).
- Uppercase labels: Sans 600, `--fs-ui-xs`, tracking `0.08em`. Codes (WX-02): Mono 500, tracking `0.04em`, text-muted.
- Times are 24 h with a Z suffix; local time is secondary and labelled (CDT). Countdowns: `T-mm:ss`, or `T-h:mm:ss` from 1 h up.
- **Minimum 11 px everywhere.**

| token | default | wall | chase/mobile |
|---|---|---|---|
| fs-ui-xs | 11 | 14 | 12 |
| fs-ui-s | 12 | 16 | 13 |
| fs-ui-m | 13 | 18 | 15 |
| fs-ui-l | 15 | 21 | 17 |
| fs-ui-xl / xxl | 20 / 28 | 28 / 38 | — |
| fs-data-xs | 11 | 14 | 12 |
| fs-data-s | 12 | 16 | 13 |
| fs-data-m | 13 | 18 | 15 |
| fs-data-l | 16 | 22 | 18 |
| fs-data-xl / xxl | 22 / 32 | 30 / 44 | — |

## 4. Spacing, radius, borders, elevation
- Spacing: `--sp-1..7` = 2, 4, 8, 12, 16, 24, 32 px.
- Component dims (default / chase / wall): top bar 44/52/64; panel header 28/36/40; row 44/52/64; `--hit-min` 24/44/40; `--chip-w` 56/64/84.
- **Gutter:** 4 px (wall 6) of `--surface-app` between panels. Panels have **no border**.
- **Splitter:** a 12 px hit area centred on the gutter (44 px in CHASE), with a 1 px `--border-strong` line and a grip chip of three 2 px dots on `--surface-raised`. `role="separator"`, ←/→ moves 16 px, double-click resets.
- **Radius:** 0 for panels, tiles, badges, chips and rows. 2 px (`--radius-control`) for anything clickable. 50% only for circular LEDs. **A rounded corner plus a border means it's a control; a flat fill means read-only.**
- **Elevation:** panels are flat. Menus use `--surface-raised` + `--elev-overlay`; toasts use `--elev-toast`. No other shadows.

## 5. Layout presets
Set `data-preset` on the app root; `tokens.css` switches everything, including the grid:
```
default: cols minmax(0,1.3fr) minmax(0,1fr) minmax(0,1fr) minmax(380px,29%) · rows minmax(0,1fr) minmax(220px,31%)
         areas "map map map feeds" "alerts radio cams feeds"
wall:    cols 460px minmax(0,1fr) 540px · rows 1fr head head · areas "alerts map feeds" "alerts map radio" "alerts map cams"   (radio + cams collapsed)
chase:   cols minmax(0,1fr) 400px · rows 1fr auto 190px head · areas "map alerts" "map feeds" "map radio" "map cams"            (cams collapsed, 1 stream)
mobile:  1 col · rows 320px auto… · areas "map" "alerts" "feeds" "radio" "cams"   (below 900 px)
```
Hierarchy: **map > active tornado warnings > streams > everything else.** The top-bar threat button keeps the most severe warning visible at all times.

## 6. Components
Each component's affordance, signifier and feedback are tabled in spec §05. Every control has a signifier that's visible without hovering. Shared states:
- **hover:** border → `--accent`.
- **focus-visible:** 2 px `--focus-ring` outline at 2 px offset.
- **pressed:** inset 1 px ink, no transform.
- **disabled:** `--text-disabled` with a `--border-default` border, no hover.
- **loading:** label becomes `◌ LOADING`, width locked.
- **error:** `■` plus the reason shown inline.

Key components (exact values in `Console.dc.html`):
- **Panel header:** LED · CODE · TITLE · meta (count + **data age**) · ▾/▸ collapse button (22 px, bordered). MAP can't collapse.
- **Status LED:** about 8 px (`fs-data-xs × .75`). The shape carries the state: ● ◌ ◐ ■ ○. Read-only, no border. aria-label = state + age.
- **Severity row:**
  - Contents: hazard chip (glyph + code; warning = solid fill, watch = `--surface-raised` with a 2 px dashed hazard border, PDS = TOR red + inset 2 px white ring) · title (600 for TOR) + area · ⌖ box (polygon alerts only) or ZONE badge · countdown + remaining-time bar.
  - Sort order: PDS → TOR → SVR → FFW → TOA → SVA, then by soonest expiry.
  - Under 10 min: `--hz-tor-text` 700.
  - Focused: `--accent-fill` background, 1 px accent outline, ⌖ box filled accent.
  - PDS: 2 px outline flashing TOR/white at 1 Hz.
  - Expired rows stay 60 s at 60% opacity with strike-through.
- **New-TOR toast:** NWS TOR/TOR-E only. Hazard block + "NEW IN AOI · SOURCE NWS …" + title + countdown + `⌖ FOCUS MAP` (primary) + `DISMISS ✕` (quiet). `role="alert"`, max 3 stacked.
- **Buttons:** primary (accent fill, ink-dark text, at most one per panel) · quiet (1 px `--border-control`) · link-out (accent text, `--accent-line` border, always ↗).
- **Layers switchboard, radar loop control, select, layout preset menu, stream tile, camera tile, top bar:** see the spec §05 table and specimens.

## 7. Map styling
Layer order, back to front: basemap → SPC → satellite → radar → watches → warnings → focused → reports → labels → controls.
- **Warnings:** 2 px hazard stroke over a 4.5 px `#040608` casing, no fill.
- **Watches:** 2 px dashed `10 6`, same casing.
- **PDS:** 2.5 px red, a 4.5 px white middle stroke and a 7 px casing, plus a 135° white hatch at 24%.
- **Focus:** fly-to the bbox + 15%, a 9 px ice halo at 35%, hazard fill 14%, ice corner brackets, other warnings dimmed to 55%.
- **Reports:** ▼ ■ ● at 9 px with a 1 px casing.
- **Basemap:** CARTO Dark Matter (no labels) or Protomaps dark. Labels go on their own layer **above radar**.
- **Attribution:** bottom-right on the scrim, Plex Mono 11 px, `--text-secondary`, text only.

## 8. Motion
Durations and easings are in `tokens.css`, and keyframes `inflow-pulse|spin|flash|arrive|reticle` are included. Nothing flashes faster than 1 Hz.

| motion | spec | reduced-motion fallback |
|---|---|---|
| LED pulse | 2000 ms ease-in-out halo | static dot |
| New warning | 240 ms slide/fade + 3× 1 Hz outline | in place, static double outline |
| Fly-to | 900 ms `cubic-bezier(.45,0,.2,1)` + 400 ms reticle 1.8→1 | jump-cut, static halo for 1.5 s |
| PDS | 1 Hz outline alternation while active | static red outline + white ring + badge |
| Collapse | 200 ms ease-out | instant |

## 9. Implementation
### Legacy → new (aliases already in tokens.css)
`--bg→--surface-app` · `--panel→--surface-panel` · `--panel-head→--surface-head` · `--border→--border-default` · `--grid→--grid-line` · `--text→--text-primary` · `--muted→--text-muted` · `--accent→--accent` · `--live→--status-live` · `--stale→--status-stale` · `--error→--status-error` · `--offline→--status-offline` · `--extreme→--hz-tor` · `--severe→--hz-svr` · `--moderate→--hz-toa`. Migrate call sites to the semantic names over time.

### New markup and behaviour
1. `data-preset` on the root, plus the layout preset menu (keys 1/2/3).
2. A top-bar threat button: count + next expiry + ⌖, which focuses the most severe TOR.
3. Alert rows: the hazard chip element, a PDS badge, a remaining-time bar, and a 60 s expired state.
4. LEDs: `data-status`, with the shape drawn in CSS (replacing the colour-only dot).
5. Splitter grip + `role="separator"`; widen the hit area.
6. Map: a separate WATCHES layer, a casing pass, the focus reticle, and a labels layer above radar. CHASE adds a ROADS + TOWNS layer.
7. Stream thumbnails: a ▲ promote button.
8. A toast region (NWS TOR/TOR-E only).
9. A "WARNINGS HIDDEN" top-bar chip whenever the warnings layer is off.
10. **Research additions (spec §10):**
    - **Data age** in every panel header meta. Radar age turns sand after 10 min, camera age after 5 min.
    - **NWS feed error state:** an alerts banner reading `NWS FEED ERROR · WARNINGS MAY BE MISSING` with last-good time, RETRY ↻ and WEATHER.GOV ↗; a top-bar chip; last-known rows at 72% opacity. A failed alert feed must never look like "no warnings".
    - **Scanner delay per call** (`~45s`, or `◐ 15m DELAY` in sand at 10 min or more). Empty states name encrypted agencies.
    - **Thumbnails are snapshots** refreshed every 15 s with a `SNAP 12s` label. Only the primary stream plays live.

### State (as modelled in Console.dc.html)
- `aoi` (drives every query)
- `preset`
- `focusedAlertId`: defaults to the most severe TOR; set by clicking a row, the threat button or the toast
- `primaryStreamId`
- `layers{}`: on/off flags
- `loop{playing, frameIdx}`
- `toasts[]`
- per-feed `{status, lastUpdated}`, from which the LED and age are derived

The alerts feed adds `{lastGood, error}` for the degraded state.

## Assets
- Fonts: IBM Plex Sans Condensed and IBM Plex Mono (Google Fonts, OFL).
- The mark is the inline SVG above.
- Icons are Unicode glyphs set in `--font-data` (▼ ◆ ≋ ▽ ◇ ⌖ ● ◌ ◐ ■ ○ ▾ ▸ ▶ ❚❚ ↗ ⤢ ✎ ✕ ↻). No icon font.
- There are no other image assets; all imagery in the mocks is placeholder.

## Files
- `tokens.css`: ship this.
- `tokens.json`: the same tokens for tooling.
- `Inflow System.dc.html`: the full spec, with live screens in §07.
- `Console.dc.html`: the screen mock and executable state rules.
- `Inflow Brand Directions.dc.html`: brand exploration, with 1a chosen (hero, lockups, app icon).
- `support.js`: mock runtime only, do not port.

## Open items
- Trademark clearance for "INFLOW".
- Validate the overlay colours against real NEXRAD and GOES imagery; the mocks use a synthetic test pattern.
- The legacy mapping is based on the variable list in the brief. Confirm it against the codebase.
