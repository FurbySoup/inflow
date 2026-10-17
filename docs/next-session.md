# Next session: finish 1.0 (ship Friday 2026-10-30)

Handoff from the 2026-10-17 Wave 11 session. Supersedes the post-Wave-10 handoff.

**State at handoff:** `main` is pushed. There are no agent worktrees and no local branches besides `main`.
- **Merged:** Waves 1–13 (WP-01…54). Gate: typecheck, lint, test (931) and build:ui all pass. CI (`ci.yml`) runs on every push and PR.
- **Plan of record:** [`docs/launch-plan.md`](launch-plan.md). Its ticked boxes are done.
- **Launch posts and release notes:** [`docs/launch-posts.md`](launch-posts.md), ready to paste.

## Wave 13 (merged 2026-10-17): pre-launch polish
This wave came from a four-reviewer UX pass. The plan and findings are in `docs/polish-plan.md`.
- **Repo renamed to `FurbySoup/inflow`** (ADR-0021). The image is `ghcr.io/furbysoup/inflow`. Internal storage keys and the npm package name stay `storm-chasers`.
- **WP-50 trust:**
  - `CHECKING NWS…` until the first answer (no more false "no alerts" on load);
  - no YouTube embed when nobody is live: a slate that says `CHECKING CHASERS…` until checked;
  - the scanner opens on the nearest state's system.
- **WP-51 layout (orchestrator):**
  - no sideways scroll at 390;
  - alert names readable at 1024 and 1366 (container query: countdown under the name);
  - the feeds column shrinks below 1280;
  - 44 px touch hit areas, a 12 px text floor, a taller narrow map, and the footer disclaimer.
- **WP-52:** START HERE help tab (default), layout tooltips, RESET outlined, PLAINS pressed on load.
- **WP-53 copy:** FEED slots, no emoji, `T-2h18` countdowns, glossary fixes, README quiet-day line, post titles.
- **WP-54:** the tab title and favicon show `(n TOR · n SVR)` for your area; panel lights flash once on arrival (never during a tornado warning, never with reduced motion).
- **Live check:** fresh visitor at 1440, plus the 390/768/1024/1366/1920/3840 measurements; no horizontal scroll anywhere.
- **Needs you:** `led.css`, `alerts.css`, `stream.css`, `StreamTile` and `Abbr` changed in the kit, so run `/design-sync` to update the Claude Design project.

## Wave 12 (merged 2026-10-17, from the user's review)
- **WP-48 + CHASER:** paste a YouTube channel link, video link or @handle; the app resolves it through YouTube, so it never trusts an ID from the input alone. The channel then joins roster liveness and went-live notifications.
  - Per browser, in localStorage, capped at 100.
  - The `/api/youtube` route now sends `SOCS=CAI` (YouTube's "reject all" consent answer); without it, UK/EU channel pages 302 to a consent wall.
  - Live-checked through Docker: add `@NASA`, total 58→59, immediate check, REMOVE back to 58, 375 px stacks.
- **WP-49 double-click start:**
  - the release zip unpacks to one folder with `Start INFLOW (Windows).cmd`, `(Mac).command`, `start-inflow.sh` and `READ ME FIRST.txt`;
  - the server opens the browser (`--open`/`OPEN_BROWSER=1`; `npm start` on a TTY) and moves to the next free port when 8080 is busy and `PORT` isn't set.
  - The Windows launcher was run from a mock unzipped folder: it fell back to 8081 and served the app.
- **Wording:** "situation room" / "mission control", never "dashboard". The release notes no longer list ruled-out ideas.
- **README:** order is no-terminal route, then Docker, then source; it has a "+ CHASER" section.

## Wave 11 (merged 2026-10-17)
- **WP-45 `server/`:** allowlisted proxy from `proxy/routes.ts`, GET-only except the CARS POSTs, header allowlists both ways, redirects never followed, in-memory cache, 127.0.0.1 by default, security headers, `/healthz`.
  - The verifier probed it live (traversal, `@`/backslash/absolute-form targets): nothing reached a non-allowlisted host.
  - The origin assertion is now mutation-checked.
- **WP-46:** `npm start` (builds on first run), multi-stage `Dockerfile` (non-root, healthcheck), `ci.yml`, `release.yml`, issue forms, `SECURITY.md`, `CONTRIBUTING.md`.
  - `release.yml` runs on a `v*` tag: it checks the tag equals `package.json` version, runs the gate, attaches a no-build zip to the release, and pushes an amd64+arm64 image to GHCR.
- **WP-47:** the `? HELP` → ABOUT tab (disclaimer, data terms, credits, version).
- **Default view:** the Plains, with five national `channelId` streams.
- **Found in the live check through the Docker image, and fixed:**
  - NWS's CDN blocked one exact User-Agent string. The default UA now carries a random per-start id, and `NWS_CONTACT` overrides it.
  - An NWS 500 carries `max-age=180`, so the browser served the cached error for 3 minutes. Proxy errors are now `no-store`.
- **Live check passed, image on port 8097:** every feed returned 200 through the container (NWS, 6 DOT proxies, KiwiSDR, YouTube, plus direct IEM/SPC/OpenMHz/basemap); ABOUT renders with no horizontal scroll at 375 px.

## Remaining before 2026-10-30
Done 2026-10-17 (after Wave 12):
- labels `source-broken` and `post-1.0` created;
- stale branch deleted (its commit is kept as tag `archive/design-sync-wave-4`);
- `gitleaks` over 163 commits: 3 false positives (NWS zone codes in test fields named `key`), now in `.gitleaksignore`, and a rescan is clean;
- `actionlint`: 0 errors.
- **Test release `v0.9.0-rc.1`:** both jobs passed (image job ~4 min). The zip unpacked to one folder (CRLF `.cmd`, 755 `.command`/`.sh`) and ran with no build. The GHCR image is amd64+arm64, non-root and healthy, and the NWS proxy answered.
  - The release, tag and package were deleted afterwards. GHCR made the package **public automatically** (linked to the public repo), so there's no "make it public" step.
  - `package.json` is still `0.9.0-rc.1`; set it to `1.0.0` on release day.

Claude can do:
- **Screenshot** for the README and the social preview (1280×640): needs a day with active warnings. `docs/screenshot.png` is referenced but not added yet.
- **Release day:**
  - `npm version 1.0.0 --no-git-tag-version`, commit, push, then `git tag v1.0.0 && git push origin v1.0.0`;
  - watch the run, then check `docker pull ghcr.io/furbysoup/inflow` and the zip (the repo was renamed; the image path is new);
  - in Git Bash, `gh api` paths need no leading slash.

Only the user can do (launch-plan §3):
- Git identity (noreply email) and GitHub email privacy settings.
- GitHub settings: secret scanning + push protection, Dependabot security updates only, private vulnerability reporting, branch protection on `main` requiring CI.
- Repo description, topics, social preview image.
- Posting (launch-posts.md): r/selfhosted on **Friday 2026-10-30**.

## Post-1.0 (file as `post-1.0` issues, don't build)
Sharing a + CHASER list between devices (export/import), a test that a user-added channel fires a went-live event, phone-width top bar rows, NOTIFY/MORE overlap, Tab-out closing MORE, a full CSP, `npx inflow-wx`, Twitch/Kick, OK/AL cameras, a POST body-read timeout (minor), chaser positions (needs Spotter Network permission).

## Process rules that cost us when skipped
- Push `main` before launching a wave; verifiers use `git worktree add --detach C:/wvNN <sha> && cd … && npm ci` in one command; `set -o pipefail`.
- Builders commit on `wp/NN-…` branches, not the worktree's own branch. Merge those.
- Python heredocs on this machine mangle backslashes in TS strings. Use Edit for anything with `\`.
- Ports 8080 and 8096 are taken on this machine by other apps. Use 8097 for local container checks.
- Don't hammer NWS with attack-style probes under the shared UA; it got that UA blocked.
