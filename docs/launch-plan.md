# Launch plan: INFLOW 1.0

Written 2026-10-17. This file decides what "good enough" means, so 1.0 can ship and then be left alone.
How it is distributed: [ADR-0020](adr/0020-self-run-distribution.md), self-run, with nothing hosted by the maintainer.

## 1. "Good enough" = these gates, nothing more

**Ship date: Friday 2026-10-30** (confirmed 2026-10-17; ADR-0020 accepted). It's a Friday because r/selfhosted only takes projects under three months old on Fridays. If a gate isn't met by then, cut the gate's scope, not the date.

1.0 ships when **every** box below is ticked. Anything else that comes up becomes a GitHub issue labelled `post-1.0`, and it does not block the release.

**Must be true at 1.0:**
- [ ] A stranger can run it in **one command** (Docker) or **three** (clone, `npm ci`, `npm start`) and see live data.
- [x] Nothing on screen depends on a dated event (Wave 11 prep, 2026-10-17):
  - curated streams use `channelId` (live-when-live), not pinned 2026-10-10 `videoId`s;
  - the default view is evergreen.
- [ ] A dead or changed upstream degrades to its panel LED. It never breaks the page. This is already true; re-check it at release.
- [ ] Licence, disclaimer, attributions and security pass (section 3) are done.
- [ ] The README gets a newcomer from landing to running in under 2 minutes (section 4).

**Explicitly not in 1.0** (already listed in `work-plan.md` and `next-session.md`):
- phone-width top bar rows;
- MORE / NOTIFY overlap;
- Tab-out closing MORE;
- Twitch/Kick;
- OK/AL cameras;
- hosted v2;
- accounts (v3);
- licensed data (v4);
- `npx` and a Deploy-to-Cloudflare button.

**The release is "finished" when:** a tagged `v1.0.0` exists, the Docker image is on GHCR, and the posts in section 6 are out. After that, maintenance is opt-in (section 7).

## 2. Build work to reach the gates (one wave, about 3 packages)

| # | Work | Notes |
|---|---|---|
| A | `proxy/routes.ts` + `server/` production server | Per ADR-0020: allowlist; GET (and CARS POST) only; cookies stripped; in-memory cache at upstream cadence; binds 127.0.0.1 unless `HOST` is set; `PORT`; `NWS_CONTACT`. Vite dev reads the same table. Tests: route matching, disallowed host/method → 403, cache TTL. |
| B | Packaging | `npm start` = build if needed, then serve. `Dockerfile`, multi-stage on `node:22-alpine`, non-root user. A GitHub Actions `release.yml` on a `v*` tag: run the gate, build, push `ghcr.io/furbysoup/storm-chasers:{version,latest}`, attach a `dist` zip to the GitHub release. A `ci.yml` runs the gate on every PR. |
| C | Evergreen defaults | `config/streams.json` goes to channel-based entries (orchestrator-owned; verified IDs only). Default AOI goes to a national or Plains view, not "GA/SC 2026-10-10". An `/about` dialog tab covers attributions and the disclaimer (reuse `? HELP`). |

## 3. Pre-launch checklist

### Legal and naming
- [x] **Licence.** MIT (`LICENSE`, `package.json`), decided 2026-10-17. The holder is "FurbySoup"; change it if you prefer your own name.
- [x] **Name.** Decided 2026-10-17: keep **INFLOW**, used unregistered and always with a descriptor ("INFLOW: storm situation room"). This was a web search, not legal advice.
  - **Findings:**
    - "inFlow" is claimed by Archon Systems for **inventory** software (inflowinventory.com), a different market;
    - other USPTO INFLOW filings cover tech support (Inflow Communications, reg. 6533238), therapy software (pending), parking software (filed 2025-12) and payments (intent to use);
    - no weather, radar or storm product named INFLOW turned up;
    - "inflow" is also an everyday meteorology term (storm inflow), so it fits but is weak as a registrable mark.
  - **So:** don't try to register it; never style it like inFlow Inventory (no "inFlow" casing, no inventory or business wording).
  - **Do not** use "Storm Chasers" as the product name: it's the Discovery Channel series (ADR-0015). The repo slug `storm-chasers` stays as a descriptive name.
  - **Package names:** npm `inflow` is taken (an InfluxDB helper); `inflow-wx` is free, if `npx` ever happens. The Docker image follows the repo: `ghcr.io/furbysoup/storm-chasers`.
- [x] **Disclaimer** in the README and the app (`? HELP` → ABOUT): "Not for life-safety decisions. Follow official NWS warnings and local officials."
- [x] **Attributions** (`src/panels/help/about.ts`, shown in ABOUT and the README):
  - NWS/SPC (public domain);
  - IEM (credit requested);
  - OpenMHz, KiwiSDR;
  - each DOT 511 source;
  - MapLibre / OpenFreeMap / OpenStreetMap (ODbL attribution is already on the map);
  - YouTube embeds.
- [x] **Data terms** stated honestly (ABOUT + README):
  - "self-run for personal use; you fetch the data from your own machine";
  - stream liveness reads public YouTube pages (ADR-0013), so it can break and is best-effort.

### Security
- [ ] **Secret scan of the full history:**
  `docker run --rm -v "$PWD:/repo" zricethezav/gitleaks:latest detect --source=/repo -v`
  A grep on 2026-10-17 found no keys or tokens, but the gitleaks run is the real check.
- [ ] **Your email.** Every commit's author is your Gmail address, and it's already public in history. Rewriting history isn't worth the breakage. Instead, from now on:
  - `git config user.name "FurbySoup"`;
  - `git config user.email "<id>+FurbySoup@users.noreply.github.com"`;
  - turn on GitHub → Settings → Emails → "Keep my email private" + "Block command line pushes that expose my email".
- [ ] **Dependencies.** `npm audit --omit=dev` is clean, and the lockfile is committed (it is).
- [x] **Proxy hardening** (WP-45; verifier probed it live, origin assertion mutation-checked):
  - not an open proxy: the host is fixed per prefix, with no user-controlled URLs;
  - method allowlist;
  - no cookies forwarded;
  - localhost bind by default.
  - Test it: `curl localhost:PORT/api/nws/..%2f..` and an absolute-URL path must not reach another host.
- [x] **XSS.** (CI guard step in `ci.yml`) No `innerHTML` / `dangerouslySetInnerHTML` in `src/` (checked 2026-10-17); upstream text renders as React text. Keep that a lint rule: `react/no-danger` or a grep in CI.
- [ ] **Iframes.** YouTube embeds keep the default referrer (Error 153 note); KiwiSDR stays link-out (HTTP).
- [x] **Production headers:** `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: SAMEORIGIN`. A full CSP is `post-1.0` (the camera image hosts make it fiddly).
- [ ] **GitHub repo settings:**
  - secret scanning + push protection;
  - Dependabot **security** updates only (version-update PRs are maintenance noise);
  - private vulnerability reporting;
  - branch protection on `main` requiring CI.
- [x] **`SECURITY.md`:** "report privately via GitHub; best-effort response".

### Repo hygiene
- [ ] Keep `.claude/agents`, `docs/packages`, `docs/adr` and `.design-sync`. The build process is a story for the AI-community posts (section 6). Add one README line pointing to it.
- [x] Remove or archive the old `docs/next-session-wave*.md` handoffs (moved to `docs/history/`).
- [ ] The remote branch `claude/design-sync-wave-4-9pjgq8` holds 1 commit not on `main`. Merge it or delete it.
- [ ] **Repo metadata:**
  - description: "Self-hosted storm-chasing situation room: radar, warnings, livestreams, scanners and DOT cameras on one screen";
  - topics: `weather`, `storm-chasing`, `nexrad`, `nws`, `self-hosted`, `maplibre`, `react`, `dashboard`;
  - a social preview image (1280×640 screenshot).
- [x] **Issue templates** (labels `source-broken` and `post-1.0` must exist in the repo): "Source broken" (which panel/state, what the LED shows) and "Feature idea" (goes to `post-1.0`). Turn Discussions on, so questions don't become issues.
- [x] `CONTRIBUTING.md`, 10 lines: run the gate; one source per PR; adapter + fixture + test; never guess stream IDs.

## 4. README structure (the landing page)
1. **Name + one line + screenshot or GIF** of a real outbreak with radar, warnings and streams. This is the single biggest factor in posts doing well.
2. **Run it:**
   - Docker one-liner: `docker run -p 8080:8080 ghcr.io/furbysoup/storm-chasers`;
   - from source: `git clone … && npm ci && npm start`.
   - Then "open http://localhost:8080".
3. **What's on screen:** a 6-bullet panel tour. The `? HELP` dialog covers the rest.
4. **Wall display / LAN:** `HOST=0.0.0.0`, the WALL preset and keyboard shortcuts.
5. **Configuration:** `PORT`, `HOST`, `NWS_CONTACT`; editing `config/streams.json`.
6. **Data sources and terms:** a table with attributions and the personal-use note.
7. **Disclaimer** (life safety).
8. **How it was built:** ADRs, work packages, a Claude Code agent factory (one paragraph + links).
9. **Contributing / licence.**

## 5. Launch day (2026-10-30)
- [ ] Tag `v1.0.0`; the release workflow is green; `docker pull` works from a clean machine.
- [ ] Run the README instructions word for word on a clean machine, or a fresh user account / VM.
- [ ] Write the release notes: what it is, the two run methods, known limits, and the `post-1.0` list.

## 6. Where to post (and when)
Disclose that you're the author in every post. Lead with the screenshot or GIF and the one-command run, not the tech.

| Where | Angle | Timing / rules |
|---|---|---|
| **r/selfhosted** | Docker one-liner, no accounts or keys, wall display on a home server | The project is under 3 months old, so **Fridays only** ("New Project Friday", 2026 rule). Re-post as a normal post after 2027-01-10 if there's news. |
| **r/stormchasing**, **r/weather**, **r/tornado** | "Free situation room I built for chase days": radar + warnings + chaser streams + scanners + DOT cams | Read each sidebar or wiki first; message the mods if self-promo is unclear. Best on an active severe day, when people are looking. |
| **Stormtrack forum** (stormtrack.org) | Long-time chaser community; their software threads are mostly years old, so a fresh tool thread fits | Post in the appropriate software/tech section; expect expert feedback (GR2/RadarScope comparisons). Pitch it as a companion, not a radar replacement. |
| **Show HN** (news.ycombinator.com) | "Show HN: A self-hosted storm-chasing situation room" | Weekday morning US time. Be in the comments for the first 2–3 hours. |
| **r/ClaudeAI** / Anthropic community | The build story: ADR-driven waves of Haiku builders + verifiers, 40+ work packages | Use the "showcase" or "built with Claude" flair if there is one. Link the `docs/` process. |
| **r/SideProject**, r/webdev "Showoff Saturday" | General dev audience | Low effort and low stakes; Showoff Saturday is Saturdays only. |
| **Second wave: March 2027** | Spring severe-weather season begins | Re-share with a "season-ready" release in the storm communities. That's when traffic peaks. |

Skip: Product Hunt (wrong audience for a self-hosted niche tool), and mass cross-posting the same day (it reads as spam).

## 7. After launch: low-maintenance by design
- **Promise:** "best-effort, community-maintained sources". Put it in the README so nobody expects an SLA.
- **Triage:** once a month, or never. Labels: `source-broken`, `post-1.0`, `good-first-issue`. Broken-source issues are ideal first PRs, since adapters are isolated with fixtures.
- **Nothing that pages you.** No hosted endpoints, no API keys to rotate, no paid accounts. Dependabot security PRs are the only automated noise. CI must pass to merge.
- **The things that rot, in order:**
  1. YouTube liveness scraping;
  2. DOT camera endpoints;
  3. the chaser roster (channels go quiet).

  All of them degrade to an LED or an empty tile, and none of them break the app.
- **Picking it back up later:** `docs/next-session.md` + `work-plan.md` follow-ups + `post-1.0` issues are the backlog. Spring 2027 is the natural moment.
