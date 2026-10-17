# Next session: finish 1.0 (ship Friday 2026-10-30)

Handoff from the 2026-10-17 Wave 11 session. Supersedes the post-Wave-10 handoff.

**State at handoff:** `main` is pushed. There are no agent worktrees and no local branches besides `main`.
- **Merged:** Waves 1–12 (WP-01…49). Gate: typecheck, lint, test (872) and build:ui all pass. CI (`ci.yml`) runs on every push and PR.
- **Plan of record:** [`docs/launch-plan.md`](launch-plan.md). Its ticked boxes are done.
- **Launch posts and release notes:** [`docs/launch-posts.md`](launch-posts.md), ready to paste.

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
Claude can do (ask first where marked):
- **Labels** `source-broken` and `post-1.0` in the repo, so the issue forms apply them. (`gh label create`; repo change, ask first.)
- **Secret scan:** run `gitleaks` over the history (pulls the `zricethezav/gitleaks` image; ask first).
- **`actionlint`** on the workflows (pulls `rhysd/actionlint`; ask first). The first real test of `release.yml` is the tag itself, so consider a dry run: tag `v0.9.0-rc.1` after setting that version, watch it, then delete the release, tag and image.
- **Screenshot** for the README and the social preview (1280×640): needs a day with active warnings. `docs/screenshot.png` is referenced but not added yet.
- **Release day:**
  - set `package.json` version to `1.0.0`, commit, tag `v1.0.0`, push the tag;
  - check `docker pull ghcr.io/furbysoup/storm-chasers` and the release zip;
  - make the GHCR package **public** (Packages → storm-chasers → settings; new GHCR packages start private). This is a user step.

Only the user can do (launch-plan §3):
- Git identity (noreply email) and GitHub email privacy settings.
- GitHub settings: secret scanning + push protection, Dependabot security updates only, private vulnerability reporting, branch protection on `main` requiring CI.
- Repo description, topics, social preview image.
- The remote branch `claude/design-sync-wave-4-9pjgq8` is an old Wave 4 planning commit, superseded. Delete it.
- Posting (launch-posts.md): r/selfhosted on **Friday 2026-10-30**.

## Post-1.0 (file as `post-1.0` issues, don't build)
Sharing a + CHASER list between devices (export/import), a test that a user-added channel fires a went-live event, phone-width top bar rows, NOTIFY/MORE overlap, Tab-out closing MORE, a full CSP, `npx inflow-wx`, Twitch/Kick, OK/AL cameras, a POST body-read timeout (minor), chaser positions (needs Spotter Network permission).

## Process rules that cost us when skipped
- Push `main` before launching a wave; verifiers use `git worktree add --detach C:/wvNN <sha> && cd … && npm ci` in one command; `set -o pipefail`.
- Builders commit on `wp/NN-…` branches, not the worktree's own branch. Merge those.
- Python heredocs on this machine mangle backslashes in TS strings. Use Edit for anything with `\`.
- Ports 8080 and 8096 are taken on this machine by other apps. Use 8097 for local container checks.
- Don't hammer NWS with attack-style probes under the shared UA; it got that UA blocked.
