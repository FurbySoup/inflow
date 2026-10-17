# WP-48 — Add your own chasers (in-app, no rebuild)
Wave 12 · ADRs: 0012, 0013, 0014, 0018, 0019

## Goal
The roster (`config/chasers.json`) and curated streams are bundled at build time. So someone running the Docker image or the release zip can't follow a new streamer without rebuilding. Add an in-app way to do it:
1. Press **+ CHASER** in the Chaser Feeds panel.
2. Paste a YouTube channel link, a video link or an `@handle`.
3. The app resolves it to a channel through YouTube itself, shows the channel name to confirm, and adds it.

Added channels join the roster's liveness round-robin. They show as LIVE NOW chips and feeds when live, and fire the "chaser went live" notification like any roster channel. They're stored per browser (`src/state/myChasers.ts`, already on `main`).

## Owns
- `src/sources/chasers/resolveChannel.ts` (new) + `resolveChannel.test.ts` + `src/sources/chasers/fixtures/` (new, trimmed real pages)
- `src/sources/chasers/allChasers.ts` (new): `toChaser(my: MyChaser): Chaser`, `mergeChasers(roster, mine)` and a `useAllChasers()` hook
- `src/panels/MyChasers.tsx` (new) + `MyChasers.test.tsx` + `src/panels/my-chasers.css` (new, imported by `MyChasers.tsx`)
- `src/sources/chasers/scheduler.ts`, `useRoster.ts` (+ their tests): the chaser list becomes dynamic
- `src/panels/StreamsGrid.tsx`: only the edits listed under Build
- `src/panels/LiveNow.tsx` (+ test): the empty-state text only

## Forbidden
- Off limits: `src/state/*` (use `myChasers.ts` as is), `src/ui/*`, `src/index.css`, `src/lib/*`, `config/*`, `proxy/*`, `server/*`, `package.json`.
- `config/chasers.json` stays orchestrator-owned and untouched.
- If one must change, stop and report the exact diff.

## Verified facts (on `main`, 2026-10-17)
- **`src/state/myChasers.ts`:** `useMyChasers` (zustand) with `chasers: MyChaser[]`, `add(chaser) → 'added' | 'duplicate' | 'full' | 'invalid'` and `remove(channelId)`. `MyChaser` = `{ channelId, name, handle, states, addedAt }`, and `MAX_MY_CHASERS` is 100. It persists to localStorage (`storm-chasers.my-chasers.v1`) and validates `channelId` as `UC` + 22 chars.
- **Roster:** `ROSTER` (`src/sources/chasers/roster.ts`) is a static `readonly Chaser[]`. `Chaser` = `{ id, name, handle, channelId, kind: 'chaser' | 'coverage', regions, states }`.
  - `useRoster.ts` creates one scheduler with `defaultDeps(ROSTER, …)`.
  - `scheduler.ts` reads `deps.chasers` in `passOrder` (once per pass) and passes it to `wentLiveEvents`.
  - `StreamsGrid.tsx` uses `ROSTER` for `rosterLive(...)`, `COVERAGE_IDS` and the LiveNow `total`.
- **The proxy:** `/api/youtube/<path>` fetches `https://www.youtube.com/<path>` with a desktop User-Agent and the `SOCS=CAI` consent cookie. Without it, UK/EU requests 302 to consent.youtube.com. Redirects are passed back, not followed.
  - **Verified with that cookie (2026-10-17):**
    - `/@RyanHallYall` and `/channel/UCJHAT3Uvv-g3I8H3GhHWV7w` → 200, about 1.8 MB.
    - Each page contains `<link rel="canonical" href="https://www.youtube.com/channel/UCJHAT3Uvv-g3I8H3GhHWV7w">`, `"externalId":"UCJHAT3Uvv-g3I8H3GhHWV7w"` and `<meta property="og:title" content="Ryan Hall, Y&#39;all">`.
    - A missing handle (`/@ThisHandleDoesNotExist123xyz`) → 404.
  - The roster was verified the same way: canonical link and `externalId` agree. That's the rule here too.
- **Fixtures:** fetch them yourself. Use `curl -s -b "SOCS=CAI" -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36" https://www.youtube.com/@RyanHallYall`, and a watch page of any public video on that channel.
  - Trim each to the `<head>` plus the few KB around `"externalId"`, `"channelId"` and `"ownerChannelName"`. Keep each fixture under 20 KB.
  - Add a hand-made "consent page" fixture: HTML with no canonical link.

## Build
- **`resolveChannel.ts`** (pure parsing, plus one async function using `fetch` through `/api/youtube` only; no hooks):
  - `parseChannelInput(text)` → `{ kind: 'handle', handle } | { kind: 'channel', channelId } | { kind: 'path', path } | { kind: 'video', videoId } | null`. Accept, trimmed:
    - `@handle`;
    - a bare `UC…` id (24 chars);
    - `youtube.com/@handle[/anything]`, `youtube.com/channel/UC…[/anything]`, `youtube.com/c/name`, `youtube.com/user/name`;
    - `youtube.com/watch?v=ID`, `youtube.com/live/ID`, `youtu.be/ID`;
    - each with or without `https://`, `www.` or `m.`.
    - Any other host, or anything that doesn't match → `null`. Handles: 3–30 chars of `[A-Za-z0-9._-]`. Video ids: 11 chars of `[A-Za-z0-9_-]`.
  - `parseChannelPage(html)` → `{ channelId, name } | null`.
    - The canonical `/channel/UC…` id and the first `"externalId"` must both exist and agree, or return `null`.
    - `name` comes from `og:title`, HTML-entity-decoded (`&#39;`, `&amp;`, `&quot;`, `&lt;`, `&gt;`, numeric).
    - `handle` comes from `"canonicalBaseUrl":"/@…"` when present, else `''`. Add it to the return type.
  - `parseWatchOwner(html)` → `channelId | null`, from `"channelId":"UC…"` in the video details. Use the first occurrence after `"videoDetails"`.
  - `resolveChannel(text, signal?)` → `{ ok: true, channel: { channelId, name, handle } } | { ok: false, reason: 'unrecognised' | 'not-found' | 'unreachable' }`.
    - Video inputs fetch the watch page first, then the channel page `/channel/<id>`.
    - Every result is confirmed by `parseChannelPage` on a channel page. Never trust an id from the input alone.
    - 404 → `not-found`. Network error, non-200 or a page that doesn't parse (e.g. a consent page) → `unreachable`.
- **`allChasers.ts`:**
  - `toChaser(my)` → `{ id: 'my-' + channelId, name, handle, channelId, kind: 'chaser', regions: [], states }`.
  - `mergeChasers(roster, mine)`: roster first, then the user's channels not already in the roster (by `channelId`).
  - `useAllChasers()` returns the merged list, memoised on the `useMyChasers` list.
- **Scheduler:** `SchedulerDeps.chasers` becomes `() => readonly Chaser[]`, read at the start of each pass and when computing went-live events. `useRoster.ts` passes `() => mergeChasers(ROSTER, useMyChasers.getState().chasers)`.
  - A channel added mid-pass is checked from the next pass. Adding one also triggers an immediate single check of that channel, so the user gets feedback within seconds: export a `checkNow(channelId)` from the scheduler, called by the UI after `add`.
  - A removed channel's result is dropped from `results`.
- **`StreamsGrid.tsx`:** use `useAllChasers()` for `rosterLive`, `COVERAGE_IDS` (it can stay roster-only) and the LiveNow `total`. Render `<MyChasers />` once, right after `<LiveNow …/>`.
- **`MyChasers.tsx`:**
  - a `ConsoleButton` "+ CHASER" (disclosure: `aria-expanded`, `aria-controls`). While open it shows an inline form, not a modal:
    - a text input labelled "YouTube channel or video link, or @handle";
    - an optional "Home state" `<select>`: "Anywhere (national)" plus the codes from `STATE_CODES` (`src/lib/states.ts`);
    - a FIND button.
  - **FIND** resolves the input (FIND is disabled and shows `FINDING…` while busy).
    - On success it shows the channel name and handle with **ADD** and **CANCEL**.
    - On failure it shows one line:
      - `unrecognised` → "Paste a youtube.com channel or video link, or an @handle.";
      - `not-found` → "YouTube has no channel at that address.";
      - `unreachable` → "Couldn't reach YouTube. Try again in a minute.".
    - A channel already in the roster → "Already on the built-in list." A channel already in the user's list → "Already added." Neither adds anything.
  - **ADD** calls `useMyChasers.getState().add(...)` and `checkNow(channelId)`, then shows "Added. It appears in the feeds when it goes live." and clears the input.
  - Below the form, list "YOUR CHASERS (n)", each with the name and a REMOVE button (accessible name "Remove <name>"). REMOVE asks for no confirmation: it's one click to add back.
  - When the list is empty and the form is closed, render only the button.
  - Escape inside the form closes it and returns focus to "+ CHASER".
- **`LiveNow` empty state:** `NO ROSTER CHASERS LIVE · CHECKED x/y` stays. `y` is now the merged total.
- **ADR-0012:**
  - the button is outlined, solid while open;
  - inputs and buttons have `:focus-visible`;
  - errors use the kit's warning text colour token.
  - Header comment with affordance, signifier and feedback.
- **ADR-0014:** no fixed widths. At ≤ 900 px the form stacks. Touch sizes come from the kit under `pointer: coarse`.
- No new on-screen acronyms. If you add one, stop and report it, since it needs a glossary entry.

## Acceptance
- [ ] `resolveChannel.test.ts`:
  - every accepted input form, and rejection of other hosts and junk;
  - `parseChannelPage` on the real fixture (name decoded, handle read), on a page where canonical and externalId disagree (→ null), and on the consent fixture (→ null);
  - `parseWatchOwner` on the real watch fixture;
  - `resolveChannel` with a mocked `fetch`: a handle → one channel-page fetch; a video link → watch fetch then channel fetch; 404 → `not-found`; a network error → `unreachable`; every fetched URL starts with `/api/youtube/`.
- [ ] `scheduler.test.ts`:
  - a channel added between passes is in the next pass;
  - `checkNow` checks one channel immediately without breaking the round-robin;
  - a removed channel disappears from `results`.
  - Existing tests are updated only for the getter signature.
- [ ] `MyChasers.test.tsx` (mock `resolveChannel` and `checkNow`):
  - the open/close disclosure;
  - FIND → name shown → ADD stores it and calls `checkNow`;
  - each error message;
  - a roster duplicate and a user duplicate;
  - REMOVE;
  - Escape restores focus.
- [ ] `set -o pipefail; npm run typecheck && npm run lint && npm test && npm run build:ui` pass.
- [ ] Orchestrator live check (not the builder): add a real channel by `@handle` and by a video link through the Docker image, see the CHECKED total rise, remove it, and check 375 px and 1920 px.
