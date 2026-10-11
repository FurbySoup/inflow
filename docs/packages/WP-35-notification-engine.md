# WP-35 — Notification engine + NWS/SPC triggers
Wave 9 · Depends on prep P8b (`SourceAdapter.background`), P9b (`src/state/notify.ts`) · ADRs: **0019**, 0012, 0014, 0018, 0003

## Goal
INFLOW left open in a background tab raises a browser notification when something new happens in the AOI: an NWS alert above the user's threshold, a new SPC watch or mesoscale discussion (MD), or an SPC Day 1 risk upgrade. Delivery follows ADR-0019 exactly. WP-36 emits "chaser went live" events to the same bus; you deliver them.

## Owns
New `src/notify/**`, all with tests:
- `engine.ts`: delivery, rate cap, de-dupe persistence;
- `prefs.ts`: threshold, enabled, permission state, persisted;
- `triggers.ts`: pure diffs;
- `useNotifyTriggers.ts`: hooks that poll and emit;
- `NotifyControl.tsx`: top-bar control and settings popover;
- `notify.css`: tokens only.

Registry edits allowed:
- `<NotifyControl />` in `src/panels/Topbar.tsx`, right before `<KeysButton />` (one element + import);
- `<NotifyEngine />` mounted once in `src/App.tsx` (one element + import).

## Forbidden
`src/state/*` (use `emitNotify` / `subscribeNotify` as they are), `src/lib/*`, `src/ui/*`, `src/sources/**` (read-only imports), other panels.

## Verified facts
- **Notification API:**
  - `Notification.requestPermission()` must run inside a click handler (user gesture) in Chrome, Firefox and Safari.
  - `localhost` counts as a secure context.
  - `new Notification(title, { body, tag, renotify: false, requireInteraction: false })`.
  - Notifications show while the tab is hidden.
  - `onclick`: `window.focus()`, then close.
- **Background timers:** Chrome throttles hidden tabs to about 1 wake per minute, so 60 s polls still run.
- **Sources** (read-only):
  - `nwsAlerts` (`src/sources/nws/alerts.ts`, 60 s): `Alert.eventKey` is the de-dupe key (updates get new ids);
  - `spcWatchBoxes` (`src/sources/iemspc/watches.ts`);
  - `spcMesoscale` (`src/sources/iemspc/mesoscale.ts`, `properties.num`);
  - `spcOutlookDay(1)` (`src/sources/spc/outlook.ts`): `properties.ISSUE` is `YYYYMMDDHHMM`, a new Day 1 issuance at 06/13/1630/20/01Z;
  - `highestCategory`, `RISK_ORDER` (`src/panels/spcRisk.ts`);
  - `alertInAoi` (`src/panels/aoiMatch.ts`);
  - `hazardCode`, `isPds` (`src/lib/hazards.ts`).
- **Background polling:** wrap each adapter as `{ ...adapter, background: true }` and call `useSource` with it. The id stays the same, so TanStack shares the cache; only your observer keeps polling while hidden.

## Build
- **`triggers.ts`** (pure; every function takes `seen` and `now` and returns `NotifyEvent[]`). First call after load: `seen === null` → return `[]` (seed).
  - `diffNwsAlerts(seen, alerts, aoi)`: in-AOI alerts with an unseen `eventKey`, `messageType !== 'Cancel'`, and `level` = hazard code.
    - Title: `TORNADO WARNING · <first area>`.
    - Body: `<area> until <HH:MM>Z.`
    - `focus` = polygon bbox when there is one.
  - `diffSpcWatches`: new watch numbers whose polygon intersects the AOI. Key `spc-watch:<num>`, `level` = `TOA` / `SVA`.
  - `diffSpcMds`: new MD numbers intersecting the AOI. Key `spc-md:<num>`, `level` = `MD`.
  - `diffRiskUpgrade(prev, next, aoi)`: emits only when Day 1 `ISSUE` changed **and** the AOI's highest category rose. Key `spc-risk:<ISSUE>`, title `SPC D1 UPGRADED TO ENH`.
- **`prefs.ts`:**
  - localStorage key `storm-chasers.notify.v1`, read and write wrapped in try/catch;
  - `{ enabled, threshold: 'TOR' | 'WARNINGS' | 'WATCHES' | 'RISK' | 'CHASERS' }`, cumulative steps per ADR-0019; default `WATCHES`;
  - a seen-keys map `{ key: epochMs }` pruned to 48 h.
- **`engine.ts`:**
  - `NotifyEngine` (renders null) subscribes to the bus.
  - Order: drop seen keys → drop below threshold → if visible, count it (the control shows `n NEW`) and stop → rate cap → `new Notification`.
  - Rate cap: at most 1 per 20 s and 10 per hour; overflow becomes one `<N> MORE IN AOI` notification.
  - Clicking a notification focuses the window and, when the event has `focus`, calls `useAoi.getState().setFocus(focus)`.
- **`NotifyControl.tsx`** (top bar):
  - `ConsoleButton` labelled `NOTIFY OFF`, `NOTIFY ON` or `NOTIFY BLOCKED`, with the visible text as its accessible name;
  - opens a popover with:
    - an enable toggle; turning it on calls `requestPermission()` inside the click;
    - threshold radios with plain-English labels;
    - `<N> NEW` count;
    - the honest note: "Only while this tab is open, including in the background. Closed tabs get nothing (v2)."
  - Denied: show `BLOCKED IN BROWSER` plus how to re-allow; never ask again on its own;
  - Escape closes the popover and focus returns to the button;
  - static acronyms use `Abbr` from `../ui` (ADR-0018). Add any new term to the glossary request list in your report (the orchestrator adds it).
- **Voice:** only NWS products are called alerts, watches or warnings. No emoji, no exclamation marks.

## Acceptance
- [ ] `triggers.test.ts`:
  - seeding;
  - new in-AOI TOR → 1 event;
  - same eventKey with a new id → 0;
  - outside the AOI → 0;
  - Cancel → 0;
  - new MD intersecting → 1;
  - risk SLGT→ENH on a new ISSUE → 1;
  - same ISSUE → 0;
  - a downgrade → 0.
- [ ] `engine.test.ts` (mock `Notification`, `document.visibilityState`, fake timers):
  - visible → no system notification and the count goes up;
  - hidden → a notification with `tag` = key;
  - the rate cap collapses overflow;
  - seen keys persist and prune after 48 h;
  - the threshold filters.
- [ ] `NotifyControl` render test:
  - permission is requested only on click (`requestPermission` not called on mount);
  - the denied state is shown.
- [ ] Orchestrator live check:
  - enable it, background the tab, and inject a fake event with `emitNotify` from DevTools → a system notification appears;
  - the top bar still fits one row at 1920 and nothing scrolls at 390.
- [ ] `npm run typecheck && npm run lint && npm test && npm run build:ui` pass.
