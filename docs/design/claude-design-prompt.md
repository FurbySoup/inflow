# Prompt for Claude Design — Storm Chasers UI, colour system & branding

Copy everything below the line into Claude Design. Attach a current screenshot of the app (`npm run dev` → http://localhost:5173) if you can.

---

## Role and goal

You are the product designer for **Storm Chasers** (working name), a single-screen, mission-control style dashboard for following live US severe weather. Design the **brand, colour system, typography, component library and screen layouts** for v1, so engineers can implement it as CSS custom properties in an existing React app without restructuring it.

The app is already built and working with a provisional dark theme. Your job is to replace "provisional" with a deliberate, cohesive system. Keep what works (dense, dark, glanceable, feed-health lights); fix what doesn't (generic colours, weak hierarchy, no brand).

## Product context

- **What it is:** one screen that follows a single *area of interest* (AOI) on a map. Every panel filters to that area: NEXRAD radar, NWS warnings, chaser livestreams, scanner/ham/CB radio, DOT traffic cameras, SPC outlooks and storm reports, GOES satellite.
- **Who uses it:**
  1. Weather enthusiasts and storm chasers following an outbreak live, often for hours.
  2. Hobbyist "nowcasters" running it on a wall display or second monitor.
  3. Later: chasers in a vehicle on a tablet. Design for this, but don't optimise v1 for it.
- **Usage contexts:**
  - 1920×1080+ wall display viewed from 2–3 m.
  - 1280×800 laptop.
  - Stacked single column below 900 px.
  - Long sessions in dim rooms at night.
- **Tone:** calm authority under pressure. Think NASA/ESA mission control, aviation glass cockpits, broadcast weather centres. Not gamer-RGB, not sci-fi HUD clutter, not consumer weather-app cute.
- **Safety:** it is not an official warning system. The design must never make an unofficial signal look more authoritative than an NWS warning.

## What exists today (build on it, rename freely)

**Layout grid.** Top bar, map (centre), feeds column (right), and a console row of three panels under the map. The feeds column and console row are resizable by dragging. Planned: resizable console panels, collapsible panels, and layout presets `DEFAULT`, `WALL` and `CHASE`.

**Panel chrome.** Every panel has a header with:
- a status LED: `live`, `loading`, `stale`, `error` or `offline`;
- a console designator code: `WX-02`, `VID-01`, `AUD-01`, `CCTV-01`, `SAT-`, `SPC-`;
- an uppercase tracked title;
- right-aligned metadata, such as a count.

**Panels and controls:**
- **Map:**
  - satellite, SPC risk polygons, radar, storm-report dots and warning polygons;
  - a focused-alert highlight;
  - a layers switchboard (top-left);
  - a radar loop control with play/pause and an `HH:MMZ` / `LIVE` frame label (bottom-left).
- **NWS Alerts list:**
  - severity-ranked;
  - `T-mm:ss` countdown, red under 10 minutes;
  - `ZONE` tag for warnings without polygons;
  - click to focus the map;
  - flashing border for PDS/emergency tornado warnings.
- **Chaser Feeds:** one primary stream plus a 2-column thumbnail grid of YouTube embeds (13 today), with `IN AOI` and `CTX` badges and an ↗ link-out.
- **Radio / Scanner:** system dropdown, play-latest, a list of recent calls with age, and receiver link buttons (`CB 19`, `2M`).
- **DOT Cameras:** auto-refreshing snapshot grid with an expanded view.
- **Top bar:** brand wordmark, AOI state list, UTC (`Z`) and local clocks.

**Current tokens.** Keep these names where sensible so implementation is a value swap:
```css
--bg #05080d; --panel #0b1118; --panel-head #0f1822; --border #1c2a38;
--grid rgba(80,160,220,.04); --text #cfe3f2; --muted #5f7a90; --accent #36c5f0;
--live #3ddc84; --stale #ffb020; --error #ff3b3b; --offline #3a4a5a;
--extreme #ff3b3b; --severe #ff8c1a; --moderate #ffd23f;
--font-ui: Segoe UI/system-ui; --font-data: ui-monospace/Cascadia Mono/Consolas
```

## Hard constraints

1. **The data owns the colour.** Radar reflectivity (greens → yellows → reds → magenta), enhanced-IR satellite (greens/reds/purples on cold cloud tops) and SPC risk categories (greens → yellow → orange → red → magenta) fill most of the screen. The UI chrome must recede:
   - Use a near-neutral, low-saturation base.
   - Pick one accent hue that cannot be confused with any radar or risk colour.
   - Show explicitly that your accent, status and severity colours stay distinguishable on top of a radar and satellite composite.
2. **Separate the three colour semantics. They must never share a swatch:**
   - **Hazard severity:** follow NWS hazard conventions where users expect them. Tornado Warning red, Severe Thunderstorm Warning orange, Flash Flood Warning dark red/maroon, Tornado Watch yellow, Severe Thunderstorm Watch pink/violet. Verify against the NWS hazards map legend.
   - **Feed health:** live, loading, stale, error, offline.
   - **Interaction/brand:** accent, focus, selection.

   Today `--error` and `--extreme` are the same red, and the "live" green collides with radar green. Fix both.
3. **Accessibility:**
   - WCAG 2.2 AA contrast for all text, including small mono data at 11–12 px.
   - Severity and status must never rely on colour alone. Pair each with a shape, icon, text or pattern.
   - Check deuteranopia, protanopia and tritanopia.
   - Every pulse, flash and blink needs a `prefers-reduced-motion` alternative. Flashing must stay under 3 Hz.
4. **Glanceability at 2–3 m:**
   - The most severe active warning in the AOI must be findable within a second.
   - Define a clear hierarchy: map > active tornado warnings > streams > everything else.
5. **Dark-first.** v1 is dark only. Structure tokens so a light theme and a high-contrast theme can be added later: semantic tokens on top of a primitive palette.
6. **Implementable:**
   - Plain CSS custom properties.
   - System fonts, or one or two Google Fonts at most (name them, with fallbacks).
   - No icon fonts. Inline SVG icons are fine (specify a small, consistent set).
   - Data values, codes, clocks and counts use tabular monospace.
7. **Branding legal care:** "Storm Chasers" is also the name of a well-known TV series. Do not imitate any network, TV show, NWS/NOAA or government branding. NOAA/NWS logos must not appear. Explore whether the working name should stay; offer 3–5 alternative names, each with a one-line rationale, and recommend one.

## Deliverables

1. **Brand:**
   - name recommendation;
   - wordmark (current: `STORM//CHASERS`);
   - a compact logo mark that also works as a 16 px favicon;
   - usage rules;
   - a one-paragraph voice and tone guide for UI copy, including the uppercase console labels and empty states such as `NO SCANNER SYSTEMS IN AOI`.
2. **Colour system:**
   - a primitive palette;
   - semantic tokens for surfaces, text, borders, accent, focus, feed status, hazard severity, map overlays (alert fills and lines, focus highlight, storm-report kinds: tornado, wind, hail) and badges;
   - a contrast table;
   - the colour-blind simulation check.
   - Output as CSS variables **and** a JSON token file.
3. **Typography:** families, a type scale (UI and data), weights, letter-spacing for uppercase labels, and tabular-number rules.
4. **Spacing, radius, borders, elevation:** a dense console scale. Specify panel gutters and the splitter hit area versus its visible line.
5. **Component specs:** anatomy, states (default, hover, focus-visible, active, disabled, loading, error, empty) and token usage for:
   - Panel (with collapse);
   - status LED;
   - badges (`IN AOI`, `CTX`, `ZONE`, `PDS`);
   - severity row with countdown;
   - splitter;
   - layers switchboard;
   - radar loop control;
   - buttons (primary, quiet, link-out);
   - select;
   - stream tile (primary and thumbnail);
   - camera tile;
   - top bar with clocks and AOI chip;
   - layout preset menu;
   - toast/banner for a new tornado warning in the AOI.
6. **Map styling:**
   - basemap recommendation (dark, low-chroma, labels that survive radar on top);
   - overlay opacity guidance;
   - alert polygon styling by severity, including watches vs warnings;
   - focus highlight;
   - attribution styling.
7. **Screens:**
   - `DEFAULT` at 1920×1080 and 1280×800;
   - `WALL` at 1920×1080;
   - `CHASE`;
   - stacked mobile at 390 px wide;
   - one "outbreak" state: several tornado warnings, one PDS, all feeds live;
   - one "quiet" state: no warnings, several feeds offline, empty panels.
8. **Motion:** LED pulse, new-warning arrival, focus fly-to cue, PDS emphasis. Give durations and easing, plus reduced-motion fallbacks.
9. **Implementation notes:** a short mapping from your tokens to the current variable names above, and anything that needs new markup.

## Output format

Start with a one-page summary covering the brand recommendation, palette swatches and three key principles. Then give each deliverable section in order. Use real hex values, never placeholders. Where you make a judgement call (for example the accent hue), state the alternative you rejected and why.
