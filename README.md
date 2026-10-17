# INFLOW: storm situation room

Radar, warnings, chaser livestreams, scanner audio and DOT traffic cameras for one area, on one screen. You run it yourself: no accounts, no API keys, nothing hosted.

<!-- Screenshot: docs/screenshot.png (1280×640, a live severe day). Added before the 1.0 posts. -->
![INFLOW during a severe-weather day: radar, warnings, chaser streams and cameras](docs/screenshot.png)

## Run it

**Docker:**
```bash
docker run --rm -p 127.0.0.1:8080:8080 ghcr.io/furbysoup/storm-chasers
```

**From source** (Node 20 or newer):
```bash
git clone https://github.com/FurbySoup/storm-chasers.git && cd storm-chasers
npm ci
npm start
```

Then open **http://localhost:8080**. The first `npm start` builds the app, which takes about a minute.

Port 8080 already in use? Use `-p 127.0.0.1:8090:8080` with Docker, or `PORT=8090 npm start`.

Prefer no build at all? Each [release](https://github.com/FurbySoup/storm-chasers/releases) has a zip. Unzip it and run `node dist-server/index.js`.

## What's on screen
- **Map:** NEXRAD radar, single-site velocity, GOES satellite, SPC outlooks (days 1–8), watches, mesoscale discussions and storm reports.
- **Warnings:** live NWS alerts for the area you're looking at. A new tornado warning gets a toast and, if you allow it, a browser notification.
- **Chaser feeds:** curated national streams, plus a 58-channel chaser roster that pops in when a channel goes live.
- **Audio:** OpenMHz scanner systems for the area, and KiwiSDR receivers for HF, ham and CB.
- **Cameras:** traffic cameras from 19 state DOT sites.
- **Top bar:** area presets (Plains, Dixie Alley, Southeast), the highest SPC risk in view, and local and UTC time.

Pan or zoom the map and every panel follows. Press `?` for shortcuts and plain-English explanations of every acronym.

## Wall display or another device on your network
By default INFLOW only listens on this computer. To open it from a TV, tablet or a second machine:
- `npm start`: run `HOST=0.0.0.0 npm start` (PowerShell: `$env:HOST='0.0.0.0'; npm start`), then open `http://<this-computer's-IP>:8080`.
- Docker: use `-p 8080:8080` instead of `-p 127.0.0.1:8080:8080`.

Pick the **WALL** layout (Shift+2) and press `F` for fullscreen.

## Configuration
| Variable | Default | What it does |
|---|---|---|
| `PORT` | `8080` | Port to serve on |
| `HOST` | `127.0.0.1` | Interface to listen on. `0.0.0.0` makes it reachable on your network. |
| `NWS_CONTACT` | the repo URL + a random id | Contact (email or URL) sent in the User-Agent to the National Weather Service, as they ask. Setting it is polite and keeps your install separate from everyone else's. |

To change the curated streams, edit [`config/streams.json`](config/streams.json) and use a channel's `channelId` from its own YouTube page. Then run `npm start -- --rebuild`.

## Data sources and terms
INFLOW is for personal use. Your own machine fetches every feed directly from its public source, so nothing is relayed by the author. Sources are best-effort: if one changes or goes down, its panel light shows it and the rest keeps working.

| Data | Source |
|---|---|
| Warnings, watches, outlooks | NOAA National Weather Service and Storm Prediction Center (public domain) |
| Radar, satellite | Iowa Environmental Mesonet, Iowa State University; NOAA nowCOAST |
| Scanner audio | OpenMHz |
| HF / ham / CB receivers | KiwiSDR owners via rx.linkfanel.net (opens on the receiver's own page) |
| Livestreams | YouTube embeds. Live status is read from public YouTube pages, so it can lag or break. |
| Traffic cameras | Each state's DOT 511 site (full list in `? HELP` → ABOUT) |
| Basemap | OpenFreeMap, © OpenStreetMap contributors (ODbL); MapLibre GL JS |

## Disclaimer
**Not for life-safety decisions.** Follow official National Weather Service warnings and your local officials.

## How it was built
INFLOW was built with Claude Code as an experiment in structured AI-assisted development. Each decision is an [ADR](docs/adr/), each feature a self-contained [work package](docs/packages/). Waves of small builder agents work in parallel git worktrees, and a verifier agent checks each one before merge (agent definitions in [`.claude/agents`](.claude/agents)).

## Contributing and licence
It's maintained best-effort. Broken-source reports are the most useful issue, and adapters are small and isolated, so they make good first PRs. See [CONTRIBUTING.md](CONTRIBUTING.md).

[MIT](LICENSE).
