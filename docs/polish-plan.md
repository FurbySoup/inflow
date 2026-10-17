# Pre-launch polish plan (Wave 13)

Written 2026-10-17 from a four-reviewer UX pass. The reviewers covered devices and readability across the 7-size matrix, first-time users (a self-hoster and a chaser, from a cleared browser on a quiet day), an "AI slop" audit and delight ideas. All four worked read-only, each in its own browser tab.

**Verdict:** the product mostly does *not* read as AI-made. The voice is terse, there's no template gloss, and the glyph system, panel codes and chaser glossary all feel considered.

What would hurt at launch is a few **trust and first-impression problems on a quiet day**, which is when most first visits will happen:
- a false all-clear while alerts load;
- a YouTube error page in the main video slot;
- sideways scroll on phones;
- alert names cut off on tablets;
- a broken README image;
- numbers that disagree between the docs and the UI.

**Rule for this wave:** everything below fits in about a day of builder time. Anything not listed goes to `post-1.0`. The ship date doesn't move.

## Before 1.0: Wave 13

### WP-50 Quiet-day trust and empty states (P1)
- **Alerts loading:** show `CHECKING NWS…` until the first success. Today `alertsView()` returns `empty` while the query is pending, so a fresh load shows "NO ACTIVE ALERTS IN AOI · NWS checked --:--:--Z". *Confirmed in `src/panels/alertGeometry.ts:48`.*
- **Alerts empty:** "No warnings in this area right now (NWS checked 19:42Z). New warnings appear within a minute; tornado warnings also pop up on screen. Watches and outlooks stay on the map." Never "all clear" or "safe".
- **Chaser feeds with nobody live:** don't embed the player. YouTube's "This video is unavailable" page is the first thing a visitor sees. Show our own slate: "No chasers live right now. INFLOW checks 58 chasers and 5 channels and shows them here when they go live." Collapse the offline tiles into a one-line list, and hide ▲ MAIN on offline tiles.
- **Disclaimer on the main screen:** add one quiet line in the attribution/footer strip, "Not for life-safety decisions · follow NWS and local officials". Never a modal.
- **Scanner default:** pick the OpenMHz system nearest the area's centre, not alphabetical. Today a Kansas view opens on Alabama. Add a one-line hint: "Recorded calls from public-safety radio, newest first."

### WP-51 Narrow and tablet layout (P1; shared CSS, so orchestrator-owned)
- **390 px sideways scroll:** `scrollWidth` 417 (two reviewers measured it independently). The AOI and clock item doesn't wrap. Also add `overflow-x: clip` on the layout, and size the help dialog with `dvw` so ESC isn't clipped.
- **Alert names cut at 1366 and 1024:** at 1024 the event name disappears entirely. Allow a 2-line clamp on `.alert-event`, use a container query to drop the ZONE chip in narrow panels, and let the feeds column shrink below 1280 with `clamp(280px, 30vw, 400px)`.
- **Touch (`pointer: coarse`):**
  - panel toggle 22 px, ↗ links 9×16 px and the select 23 px all go to 44 px;
  - phone inputs get 16 px text (avoids iOS zoom-on-focus).
- **Text floor:** 12 px for the stream tags and camera captions, which are 10.4–11 px today. The "NO TORNADO WARNINGS" line goes up a size, because it's the most important thing to glance at.
- **Narrow map:** compact attribution (it covers SRV/WeatherWise/LIVE today), LAYERS starts collapsed, and the map height is `clamp(320px, 45dvh, 520px)`.
- **Contrast:** brighter outline for flash flood warnings on the map. #8B0000 measures 1.9:1 against the basemap. Keep the NWS fill and add a light casing.

### WP-52 First-run understanding (P1/P2)
- **"START HERE" help tab, first in the list.** Five lines: pan or zoom or use the presets and every panel follows; the panel light legend (● ◌ ◐ ■ ○); what "CHECKED x/58" means; what DEFAULT/WALL/CHASE do; what NOTIFY does.
- **Tooltips on DEFAULT/WALL/CHASE**, e.g. WALL: "Big map and video for a TV or second monitor".
- **PLAINS shows as pressed on first load.** The fitted view's south edge is 31.054 against a 0.05 slack in `matchPreset`.
- **Copy fixes:** the SE glossary line still says "(the default area)"; it should read "Southeast preset: Georgia and South Carolina". NOTIFY "Closed tabs get nothing (v2)" becomes "Works only while this tab is open."

### WP-53 Copy and consistency pass (orchestrator, one sitting)
- **Counts:** use real numbers everywhere: 49 work packages, 58 chasers. Today `launch-posts.md` says 47 and "about 60".
- **"VELOCITY ( SRV , NEAREST RADAR)":** fix the stray spaces around abbreviations in layer labels.
- **Glyphs and wording:**
  - 🔊/🔇 is the only colour emoji in the UI; swap it for the mono glyphs.
  - Stream slots go from "CAM 01" to "FEED 01" (CAM collides with the DOT cameras).
- **Copy:**
  - ABOUT "community-maintained" becomes "best-effort" (it's one maintainer);
  - delete the unused `V2` glossary entry;
  - merge THUMB and THUMBS;
  - use "and" not "&" in help group names.
- **Signifiers:**
  - no dotted abbreviation underline inside buttons and chips (it reads as links);
  - MORE gets a small "LAYOUT" label;
  - RESET gets a border (ADR-0012 signifier).
- **Countdowns:** show seconds only under 1 hour and only for TOR/SVR/FFW; otherwise `T-2h18` / `T-18m`.
- **README:** add one line saying "on a quiet day most streams are offline and the alert list may be empty; try the SPC D1–D8 days", and the screenshot (or remove the broken image line until there is one).
- **Launch posts:**
  - tighten the r/selfhosted title;
  - rewrite the r/ClaudeAI title, with no "Here's the process" and no "dashboard".

### WP-54 Delight (pick these two; both small, real data only)
- **Tab title and favicon show warnings in your area:** `(2 TOR) INFLOW` plus a red dot, so you see it from another tab. With nothing active it is plain "INFLOW", never "all clear".
- **Panel lights "power on" at first load:** each panel's LED flashes once as its feed actually answers. No fake delays, nothing held back. Skipped under reduced motion and while any tornado warning is active.

## If there's time after Wave 13 (stretch, in order)
1. **Storm motion and hail on warning rows:** `→ NE 35 kt · 1.75" hail · RADAR INDICATED`, from fields the NWS alert already has. It's the most "made by chasers" touch. M, and it touches the shared `Alert` type.
2. **Share-a-view link:** the map position, layers and layout go in the URL hash, with "COPY VIEW LINK" in MORE. It only opens for people running their own copy. M.
3. **Wall display scales text by itself:** the `--fs-ui-*` tokens become rem, or WALL turns on automatically at ≥2560 px when no layout is saved. M.

## Post-1.0 (file as issues)
- a radar colour legend / "what am I looking at";
- day/night terminator and sunset time;
- `G` (go to newest warning) and `M` (mute all);
- a clean-screen mode for screenshots;
- the phone top-bar redesign (162 px today);
- an SPC day picker as a select on phones;
- a quiet chaser easter egg (never during an active warning).
- **Not doing:** warning sounds. If one is ever built: opt-in, one soft tone, never siren- or EAS-like.

## Decision needed from you
- **Repo name vs product name.** The product is INFLOW, but the repo, image and storage keys say `storm-chasers`. On HN that looks like an unfinished rename.
  - **Option 1:** rename now. GitHub redirects the old URLs, nobody uses the image yet, and this is the cheapest moment there will ever be. That gives `FurbySoup/inflow` and `ghcr.io/furbysoup/inflow`.
  - **Option 2:** keep the name and add one README line.
