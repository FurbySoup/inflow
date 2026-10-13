# Next session: after Waves 8–9

Handoff from the 2026-10-11…13 session. Supersedes `docs/next-session-wave8.md`.

**State at handoff:** `main` is pushed and clean; no agent worktrees are left.
- **Merged:** Waves 1–9 (WP-01…40).
- **Gate:** typecheck, lint, test and build:ui all pass, with 688 tests.
- **Claude Design:** "Storm Chasers UI" is re-synced with 11 components, including Abbr and TaggedText, and the conventions header covers acronym tips.

## Paste this to start the session

> Continue INFLOW (Storm Chasers repo). Read `CLAUDE.md`, `docs/next-session.md`, `docs/work-plan.md` (Waves 8–9 sections and their follow-ups) and `docs/roadmap.md`, plus ADRs 0010, 0014, 0016–0019.
> 1. **Close the open live checks first** (below). They need the browser pane visible, or me.
> 2. **Ask me which track comes next:** (a) Wave 10, the polish backlog below; (b) v2 hosting (Cloudflare Pages + Worker, roadmap §v2); or (c) something new. Then follow the usual flow: re-verify any research, do the orchestrator prep on `main` and push, write the packages, stop and show me the plan, and launch builders and verifiers only after approval.
> 3. After merging: live-check the ADR-0014 matrix, and re-sync Claude Design (`/design-sync`) if `src/ui` changed.

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

## Open live checks (not yet confirmed)
1. **SPC D1–D8 on a rendered map:** press D2, D3 and D5. Polygons should change visibly above radar, and D5 should show "PREDICTABILITY/POTENTIAL TOO LOW".
2. **A real background-tab notification:** NOTIFY → allow → background the tab, then wait for something new or inject one in DevTools: `(await import('/src/state/notify.ts')).emitNotify({ kind: 'nws-alert', key: 'test-1', title: 'TEST', body: 'Test.', at: Date.now(), level: 'TOR' })`.
3. **The HWO strip for an office with an HWO:** done for FFC. The default AOI centre is CHS, which has none.

## Wave 10 backlog (polish; each item is small)
- Roster scheduler: re-arm on `visibilitychange`. Up to 60 s of lag after the tab becomes visible again.
- Panel LED for AUD-01 ignores OpenMHz list errors.
- Two OpenMHz systems are both named "Alabama Interoperable Radio System". Show the shortName to tell them apart.
- HWO fixtures still carry the county lists (trim them).
- Tablet-portrait top bar is now 3 rows (95 px), with NOTIFY + HELP. Consider an overflow menu at ≤ 900 px.
- NotifyControl: re-read the browser permission when the popover opens.
- SPC day control: a cosmetic `aria-busy` lingers when switching to an already-loaded day.
- CHASE preset label vs manual collapse: intentional, so leave it unless the user asks.
- Glossary candidates for D4–8 empty labels ("Predictability Too Low" / "Potential Too Low"); confirm the wording against SPC first.

## Bigger items (need the user)
- **Chaser positions / pin a chaser on the map:** needs written permission from Spotter Network (their terms forbid redisplay). The design is in `docs/work-plan.md` (Wave 9 notes). The user would have to request it.
- **v2 (`docs/roadmap.md`):**
  - Cloudflare Pages + one Worker mirroring `vite.config.ts` proxies;
  - terms gate for IEM, OpenMHz, DOT feeds and YouTube;
  - YouTube Data API key as a Worker secret;
  - Web Push for closed-tab notifications;
  - trademark clearance for "INFLOW" is still pending.

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
