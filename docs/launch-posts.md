# Launch posts (ready to paste)

Drafted 2026-10-17 for the 2026-10-30 release. They're plain and factual on purpose: show the screenshot, say what it does, say you made it, and stop. Replace `<screenshot>` with the image upload. Each post can be published and then left alone, with no need to reply to every comment.

Posting order (launch-plan §6): r/selfhosted on **Fri 2026-10-30**, Show HN on a weekday morning (US time) the next week, then the storm communities on the next active severe day. Space the rest out over a week or two.

---

## Release notes (GitHub release v1.0.0)
**INFLOW 1.0: storm situation room**

Radar, NWS warnings, chaser livestreams, scanner audio and DOT traffic cameras for one area, on one screen. You run it yourself: no accounts, no API keys.

**Run it**
- **No terminal:** install Node.js LTS from nodejs.org, download `inflow-v1.0.0.zip` below, unzip it and double-click **Start INFLOW**. Your browser opens on it.
- **Docker:** `docker run -d --restart unless-stopped -p 127.0.0.1:8080:8080 ghcr.io/furbysoup/storm-chasers`, then open http://localhost:8080
- **Source:** `git clone`, `npm ci`, `npm start`

Follow a streamer who isn't on the built-in list: **+ CHASER** in the Chaser Feeds panel, then paste their YouTube link.

**Known limits:**
- Stream live status depends on public YouTube pages and may break.
- Cameras cover 19 state DOT sites; OK and AL aren't in yet.
- The top bar at phone width is still busy.

Ideas and broken sources are welcome as GitHub issues.

Not for life-safety decisions. Follow official NWS warnings.

---

## r/selfhosted (New Project Friday, Fri 2026-10-30)
**Title:** INFLOW: a self-hosted mission control for storm chasing (radar, warnings, chaser streams, scanners, DOT cams). One Docker command, no API keys

**Body:**
<screenshot>

I made this for watching severe weather days on a spare monitor. It puts NEXRAD radar, NWS warnings, chaser YouTube livestreams, OpenMHz scanner audio and state DOT traffic cameras on one screen. Everything follows whatever area the map is showing.

- `docker run -d --restart unless-stopped -p 127.0.0.1:8080:8080 ghcr.io/furbysoup/storm-chasers`
- Not a Docker person? There's a zip with a double-click start too.
- No accounts, no API keys, no telemetry. Your server fetches the public feeds directly.
- It has a WALL layout for a TV or wall display; set `HOST=0.0.0.0` or publish the port on your LAN.
- amd64 and arm64 images (it runs on a Pi).
- MIT licence.

Repo: https://github.com/FurbySoup/storm-chasers

I'm the author. It's maintained best-effort. The data sources are public and occasionally change, and a broken one just shows on its panel light.

---

## Show HN (weekday, ~8–10am US Eastern)
**Title:** Show HN: INFLOW – a self-hosted storm-chasing situation room

**URL:** https://github.com/FurbySoup/storm-chasers

**First comment (post it yourself right away):**
I built this to follow severe-weather days on one screen: radar, NWS warnings, chaser livestreams, scanner audio and DOT traffic cameras, all filtered to the area the map shows.

It's a React + MapLibre app with a tiny Node proxy. Around 20 public sources either don't send CORS headers or want an identifying User-Agent, so the proxy has a fixed allowlist and is GET-only apart from a handful of GraphQL POSTs. There are no API keys and nothing is hosted; you run it yourself (Docker or `npm start`).

The build process may interest people too. It was written with Claude Code in waves of small "work packages", each built by a cheap agent in its own git worktree and checked by a verifier agent before merge. The ADRs and packages are in `docs/`.

Not a replacement for RadarScope/GR2; it's a companion screen. Not for life-safety decisions.

---

## r/stormchasing, r/weather, r/tornado (on an active severe day; read each sidebar first)
**Title:** I made a free situation-room screen for chase days: radar + warnings + chaser streams + scanners + DOT cams

**Body:**
<screenshot>

It's a situation room you run on your own computer. Pick an area and every panel follows it:
- NEXRAD radar and velocity;
- live NWS warnings;
- SPC outlooks and MDs;
- chaser livestreams (it notices when about 60 known chasers go live, and you can add any other YouTube streamer);
- OpenMHz scanners;
- state DOT traffic cameras.

It's free and open source, with no account or keys. Install Node.js, unzip, and double-click to start: https://github.com/FurbySoup/storm-chasers

I'm the author, posting in case it's useful to anyone here. It's a companion screen, not a radar app replacement, and not for life-safety decisions. Corrections to the chaser list are welcome.

---

## Stormtrack forum (software / technology section)
**Title:** INFLOW: a free, self-hosted storm situation room (radar, warnings, streams, scanners, DOT cams)

**Body:**
Use the r/stormchasing text above. Add at the end: "If any of the SPC/NWS wording in the built-in glossary (`?` key) is off, I'd like to fix it."

---

## r/ClaudeAI (showcase / "built with Claude" flair)
**Title:** Built a 47-work-package app with waves of Haiku builder agents + verifier agents. Here's the process

**Body:**
<screenshot>

INFLOW is a mission-control style situation room for storm chasing (radar, warnings, streams, scanners, cameras). The interesting part for this sub is how it was built:
- every decision is an ADR, and every feature a self-contained work package with "owns / forbidden / verified facts / acceptance";
- an orchestrating session does the shared-file prep, then launches one Haiku builder per package in its own git worktree, in parallel;
- a verifier agent checks each branch against its acceptance list before merge;
- content that must be correct (meteorology terms, verified channel IDs) is written by the orchestrator and marked "never edit".

The agent definitions are in `.claude/agents`, and the packages are in `docs/packages`: https://github.com/FurbySoup/storm-chasers

I'm the author. Happy to answer process questions.

---

## r/SideProject (any day) / r/webdev Showoff Saturday (Saturdays only)
Use the r/selfhosted text, with the title "INFLOW: a one-screen storm situation room you run yourself".
