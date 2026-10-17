# WP-49 — Double-click start for non-technical users
Wave 12 · ADRs: 0020

## Goal
Someone who has never used a terminal can run INFLOW in three steps:
1. install Node.js;
2. download and unzip the release;
3. double-click **Start INFLOW**.

The browser then opens on the app by itself. If port 8080 is busy, INFLOW quietly picks the next free port instead of failing. Any problem is explained in plain words in the window that opened.

## Owns
- `server/index.ts` (+ new `server/listen.ts`, `server/openBrowser.ts` and their tests)
- `launchers/` (new): `Start INFLOW (Windows).cmd`, `Start INFLOW (Mac).command`, `start-inflow.sh`, `READ ME FIRST.txt`
- `.github/workflows/release.yml`: the zip step only
- `scripts/start.mjs`: pass `--open` through (see below)

## Forbidden
`server/app.ts`, `server/proxy.ts`, `server/static.ts`, `server/cache.ts`, `proxy/*`, `src/**`, `package.json`, `Dockerfile`, `README.md` (the orchestrator writes it). If one must change, stop and report.

## Verified facts (on `main`, 2026-10-17)
- **`server/index.ts`:**
  - reads `PORT` (default 8080) and `HOST` (default `127.0.0.1`);
  - on a listen error it prints `INFLOW: could not listen on host:port (CODE)` and exits 1;
  - after listening it logs `INFLOW listening on http://host:port`.
- **The release zip** (`release.yml`, "Package zip" step): `zip -r "inflow-$TAG.zip" dist dist-server LICENSE README.md`. It runs on ubuntu-latest, and `zip` is preinstalled there.
- The bundled server is `dist-server/index.js`, with no npm dependencies. Node ≥ 20.
- `scripts/start.mjs` builds if needed, then `import()`s `dist-server/index.js`.
- On the maintainer's machine, ports 8080 and 8096 are taken by other apps. That's common on home servers (qBittorrent uses 8080 by default).

## Build
- **Port fallback (`server/listen.ts`):** export `listenWithFallback(server, { port, host, explicitPort, tries = 10 })` → the bound port.
  - When `PORT` was **not** set or is empty (`explicitPort` false) and the port is in use (`EADDRINUSE`), try the next port up to `tries` times and log: `INFLOW: port 8080 is busy, using 8081 instead.`
  - When `PORT` **was** set, never fall back: print the existing error plus `Set PORT to a free port, e.g. PORT=8090.` and exit 1.
  - `EACCES` and other errors: a clear one-line message, then exit 1.
- **`--open` / `OPEN_BROWSER=1`:** after listening, open the default browser at `http://localhost:<port>/`.
  - Use `127.0.0.1` if `HOST` is `127.0.0.1`. When `HOST` is `0.0.0.0`, still open `localhost`.
  - Use `child_process.spawn` with `detached: true, stdio: 'ignore'`, then `unref()`:
    - Windows: `cmd /c start "" <url>`;
    - macOS: `open <url>`;
    - Linux: `xdg-open <url>`.
  - A failure to open is non-fatal: log "Open <url> in your browser."
  - Never open from inside Docker. Skip it when `/.dockerenv` exists.
- **Startup lines** (after listening), for everyone:
  ```
  INFLOW is running: http://localhost:8080
  Leave this window open while you use it. Close it (or press Ctrl+C) to stop INFLOW.
  ```
  Keep the existing `listening on` line, which tests or logs may rely on, and the LAN note.
- **`scripts/start.mjs`:** when stdout is a TTY, set `OPEN_BROWSER=1` before importing the server, so `npm start` opens the browser too. Don't set it if `OPEN_BROWSER` is already defined (lets `OPEN_BROWSER=0` opt out).
- **`launchers/`** (each script runs from its own folder: `cd` to the script's directory first):
  - `Start INFLOW (Windows).cmd`:
    - `@echo off`, `title INFLOW`, `cd /d "%~dp0"`;
    - if `where node` fails, print "INFLOW needs Node.js (free). Install the LTS version from https://nodejs.org, then double-click this file again." and `pause`;
    - otherwise run `node dist-server\index.js --open`; if it exits non-zero, `pause` so the window stays open with the message.
  - `Start INFLOW (Mac).command`: bash, `cd "$(dirname "$0")"`. Do the same Node check (open https://nodejs.org with `open` if missing), then `node dist-server/index.js --open`. On failure, `read -n 1 -p "Press any key to close"`.
  - `start-inflow.sh` (Linux): same as the Mac script, without the `open`.
  - `READ ME FIRST.txt` (plain text, short):
    - the three steps;
    - Mac: the first time, right-click → Open (Gatekeeper);
    - Windows: if SmartScreen says "Windows protected your PC", click More info → Run anyway;
    - how to stop it;
    - how to change the port;
    - the disclaimer line: "Not for life-safety decisions. Follow official NWS warnings and your local officials."
  - Use LF line endings for `.command`/`.sh` and CRLF for `.cmd`. Add a `launchers/.gitattributes` to pin this: `*.cmd text eol=crlf`, `*.command text eol=lf`, `*.sh text eol=lf`.
- **`release.yml` zip step:**
  - copy `launchers/*` into the zip root next to `dist/` and `dist-server/`;
  - `chmod +x` the `.command` and `.sh` files before zipping (zip keeps the mode bits);
  - zip into a top-level folder `inflow-$TAG/`, so unzipping makes one folder;
  - exclude `launchers/.gitattributes`.

## Acceptance
- [ ] `server/listen.test.ts` with real `http` servers on ephemeral ports:
  - occupy a port and confirm the fallback picks the next one when not explicit;
  - an explicit busy port → the error path (inject `exit` so the test doesn't kill vitest).
- [ ] `server/openBrowser.test.ts`: the command per platform (inject `platform` and `spawn`), the URL host rule, a spawn error being non-fatal, and the Docker skip (inject the `/.dockerenv` check).
- [ ] Run this exact one-shot check:
  `npm run build && npm run build:server && (timeout 8 node dist-server/index.js & sleep 2; timeout 6 node dist-server/index.js; wait) || true`
  The second server must report "port 8080 is busy, using 8081 instead." If 8080 is busy on your machine anyway, both shift; report what you saw. **Don't pass `--open`.**
- [ ] `set -o pipefail; npm run typecheck && npm run lint && npm test && npm run build:ui` pass.
- [ ] Orchestrator (not the builder): run the Windows launcher from an unzipped dry-run release and confirm the browser opens.
