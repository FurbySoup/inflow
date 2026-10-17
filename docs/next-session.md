# Next session: Wave 11, ship 1.0 (ADR-0020)

Handoff from the 2026-10-17 session. Supersedes the post-Wave-9 handoff.

**State at handoff:** `main` is pushed and clean. There are no agent worktrees, and no local branches besides `main`.
- **Merged:** Waves 1–10 (WP-01…44). Gate: typecheck, lint, test (720) and build:ui all pass.
- **Decided 2026-10-17:**
  - MIT licence (added);
  - name stays **INFLOW**, used unregistered with a descriptor (see `docs/launch-plan.md` §3);
  - ship date **Friday 2026-10-30**;
  - **ADR-0020 accepted:** 1.0 is self-run (`npm start` + a Docker image on GHCR), and nothing is hosted by the maintainer.
- **The plan of record is [`docs/launch-plan.md`](launch-plan.md):** the "good enough" gates, the build work (§2), the pre-launch checklist (§3), the README outline (§4), launch day (§5), where to post (§6) and low-maintenance rules (§7).

## Paste this to start the session

> Continue INFLOW (storm-chasers repo). Read `CLAUDE.md`, `docs/next-session.md`, `docs/launch-plan.md`, ADR-0020 and ADR-0005, plus ADR-0010 for the wave process.
> Goal: Wave 11 = the launch-plan §2 build work (A server, B packaging/CI, C evergreen defaults + About), so 1.0 can ship on Friday 2026-10-30.
> 1. **Orchestrator prep on `main`** (shared files):
>    - extract the proxy table from `vite.config.ts` into `proxy/routes.ts`, with Vite reading it (no behaviour change; gate green);
>    - make the NWS User-Agent configurable (`NWS_CONTACT`, defaulting to the repo URL);
>    - replace the dated 2026-10-10 entries in `config/streams.json` with verified `channelId` entries (confirm each on the channel's own `/streams` page; never guess IDs);
>    - choose an evergreen default AOI;
>    - push.
> 2. **Write packages** WP-45 (production server: allowlist, GET + CARS POST only, cookies stripped, cache, 127.0.0.1 default, security headers, tests incl. a no-open-proxy test), WP-46 (`npm start`, Dockerfile non-root, `ci.yml` + `release.yml` to GHCR on a `v*` tag) and WP-47 (About/attributions tab in `? HELP`, disclaimer). Stop and show me the plan; launch builders and verifiers only after approval.
> 3. After merging: run the server locally and live-check all panels through it, plus the ADR-0014 matrix. Then draft the README per launch-plan §4, with me.

## What exists now (orientation, beyond `CLAUDE.md`)
- **Any area (Wave 8):**
  - 52-code AOI states from simplified Census shapes (ADR-0016, `src/lib/states.ts`, `geo.ts`, `stateAt`); states come back nearest-first;
  - alerts match the AOI by polygon (`src/panels/aoiMatch.ts`);
  - OpenMHz systems for any area;
  - `CAMERA_SOURCES` registry with 24 DOT sources (CARS, IBI 511, WSDOT, Caltrans);
  - SPC outlook D1–D8 + AOI risk in the top bar;
  - GOES-West west of 105°W;
  - the AOI local clock (`nwsPoint` → `timeZone`);
  - press-to-WATCH stream sub-windows, muted and uncapped (ADR-0017).
- **Wave 9:**
  - acronym tips: the kit `Abbr` / `TaggedText` + `src/ui/glossary.ts`, and every new on-screen acronym needs an entry (ADR-0018);
  - the notification engine in `src/notify/**`, fed by the `src/state/notify.ts` bus (ADR-0019);
  - the chaser roster: `config/chasers.json` holds 58 verified channels and is orchestrator-owned (never guess IDs); round-robin liveness, LIVE NOW chips, "chaser went live", the SN MAP ↗ link-out;
  - the HWO strip (`src/sources/nws/hwo.ts`; offices without an HWO return 500 = no strip);
  - the SPC day selector draws D2–D8 above radar;
  - `? HELP`: tabs, search, and 78 chaser terms in `src/panels/help/chaserTerms.ts` (orchestrator-written, never generated).
- **Dev server:** another session sometimes holds port 5173. The `.claude/launch.json` config `dev-alt` runs on 5174.

## Live checks (all closed 2026-10-17)
1. **SPC D1–D8:** D2/D3 visibly differ above radar; D5 renders nothing with "POTENTIAL TOO LOW" (now glossary-tipped).
2. **Background-tab notification:** confirmed by the user in Chrome. Gotcha: Chrome showed "Blocked by an extension" until a blocking extension was switched off entirely (restricting its site access is not enough, since its content-settings rule persists).
3. **HWO strip:** done for FFC. The default AOI centre is CHS, which has none.

## Wave 10 (merged 2026-10-17, WP-41…44 + prep)
Done: roster re-arm on visible, AUD-01 LED covers both feeds, duplicate OpenMHz names show their shortName, NotifyControl re-reads permission, the ≡ MORE menu at ≤ 900 px, D4–8 empty-day glossary tips, the stale outlook `aria-busy` flag. Gate: 720 tests.
Remaining polish (see work-plan Wave 10 follow-ups): the phone-width top bar is still 5 rows; the nested NOTIFY popover isn't anchored to MORE; Tab out of MORE doesn't close it; `?` opens help with MORE open. CHASE label: intentional.
Claude Design: `src/ui/glossary.ts` gained two entries since the last sync. Re-run `/design-sync` if the glossary should show in previews.

## Things only the user can do before 2026-10-30 (launch-plan §3)
- **Git identity:** set the GitHub noreply email for future commits, and turn on "Keep my email private" + "Block command line pushes that expose my email".
- **GitHub settings:**
  - secret scanning + push protection;
  - Dependabot security updates only;
  - private vulnerability reporting;
  - branch protection on `main` (after `ci.yml` exists).
- **Repo metadata:** description, topics, and a social preview image (1280×640 screenshot of a live outbreak).
- **Secret scan:** run `gitleaks` over the full history (command in launch-plan §3). Claude can run it if Docker is available.
- **Remote branch:** `origin/claude/design-sync-wave-4-9pjgq8` has 1 commit not on `main`. Merge it or delete it.
- **Posts** (§6): r/selfhosted on Fridays only (the project is under 3 months old); read the storm subreddits' sidebars first.

## Bigger items (after 1.0)
- **Chaser positions / pin a chaser on the map:** needs written permission from Spotter Network (their terms forbid redisplay). The design is in `docs/work-plan.md` (Wave 9 notes).
- **Hosted v2 (`docs/roadmap.md`) is optional now (ADR-0020).** It would need a terms gate, a YouTube Data API key and Web Push. A Deploy-to-Cloudflare button is the cheaper middle ground, with the caveats in ADR-0020.
- **Post-1.0 polish:** the phone-width top bar (5 rows), NOTIFY/MORE overlap, Tab-out closing MORE, a full CSP, `npx inflow-wx`.

## Process rules that cost us when skipped (also in agent memory)
- Push `main` before launching a wave.
- **Commands:**
  - verifiers `git worktree add --detach C:/wvNN <sha> && cd … && npm ci` in **one** command;
  - never run npm in the main repo while a dev server holds esbuild;
  - run checks with `set -o pipefail`.
- **Package writing:**
  - never give a directory both `Foo.tsx` and `foo.ts`. It happened 3 times, once in WP-31.
  - content that must be correct (meteorology, verified IDs) is written by the orchestrator in prep and marked "never edit" in packages.
- **Builders:** no dev servers or browser (ignore the PostToolUse hook that suggests one); Write/Edit, not heredocs.
- **Reviewing reports:** read builder reports critically before verification. This wave caught the HWO spotter guess, the preset double descriptions and the GOES credit that way.
- **Browser pane:**
  - hidden → 0×0 and rAF 0, so the map never loads and the preset is picked as mobile. Use `resize_window` + reload for layout checks.
  - never set `input.value` from JS on React inputs (it desyncs them); focus with JS and type with `computer`.
- **Claude Design:** DesignSync only runs inside the user-started `/design-sync`. YouTube previews must not autoplay (the capture waits for network idle).
