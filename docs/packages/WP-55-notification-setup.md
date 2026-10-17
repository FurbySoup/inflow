# WP-55 — Notification setup journey: SEND TEST, honest states, clear limits
Wave 14 · ADRs: 0012, 0018, 0019, **0022** (read it first)

## Goal
A first-time user can turn notifications on, prove they work in ten seconds, and understand exactly when they will and won't arrive. Every "can't work here" case names its real cause and fix. This comes from a three-reviewer audit; the maintainer hit the same problems.

## Owns
- `src/notify/NotifyControl.tsx`, `src/notify/engine.ts`, `src/notify/prefs.ts`, `src/notify/notify.css` (+ their tests)
- new `src/notify/setupState.ts` (pure: state and reason detection) + `setupState.test.ts`

## Forbidden
- `src/notify/notifyCopy.ts`: **never edit**. The orchestrator wrote it. Render its strings exactly.
- Also off limits: `src/state/*`, `src/ui/*`, `src/index.css`, `src/lib/*`, `triggers.ts`, `useNotifyTriggers.ts`, `NotifyEngine.tsx`, `src/panels/*`.
- If one must change, stop and report the diff.

## Verified facts (on `main`, 2026-10-17)
- **`NotifyControl.tsx`:**
  - `Status` = `off | on | blocked | unsupported`;
  - `statusOf(enabled, permission, unsupported)` returns `off` first when unticked;
  - `askPermission()` runs only from a click;
  - the popover renders a checkbox, the state lines, a threshold `fieldset` built from `THRESHOLDS`/`THRESHOLD_LABELS`, "`n` NEW" and a note.
  - It re-reads the live permission on popover open and when the tab becomes visible.
- **`engine.ts`:**
  - `createEngine(io = systemIo)`; `systemIo` wraps `new Notification(title, { body, tag, requireInteraction: false })`;
  - `send(...)` catches a constructor throw and sets `unsupported`;
  - the rate cap is 1 per 20 s and 10 per hour;
  - overflow goes out as `` `${n} MORE IN AOI` `` with body "Open the console to see them.";
  - `onVisible()` closes what it opened.
  - `getNotifyRuntime()` / `useNotifyRuntime()` expose the runtime (count, unsupported).
  - `NotifyEngine.tsx` mounts one engine.
- **`prefs.ts`:**
  - `THRESHOLDS = ['TOR','WARNINGS','WATCHES','RISK','CHASERS']`;
  - `DEFAULT_PREFS.threshold` is `'WATCHES'`;
  - stored prefs are validated on load.
- **Copy:** `notifyCopy.ts` exports `NOTIFY_LABEL`, `NOTIFY_BUTTON_TITLE`, `POPOVER_HEADING`, `TOGGLE_LABEL`, `areaLine()`, `STATE_LINE`, `UNAVAILABLE`, `BLOCKED`, `THRESHOLD_LEGEND`, `THRESHOLD_COPY`, `TEST_BUTTON`, `TEST_NOTIFICATION`, `TEST_RESULT`, `LIMITS`, `countLine()` and `OVERFLOW`.
- **The AOI:** `useAoi((s) => s.states)` (nearest-first). Use `src/panels/Topbar.tsx`'s `aoiLabel` formatting idea, the first 6 then `+N`. Re-implement that small join locally; don't import Topbar.
- **The browser pane** used for live checks denies notifications by itself, so unit tests must cover the granted path with a fake `Notification`.

## Build
- **`setupState.ts` (pure, injectable inputs for tests):**
  - `unavailableReason({ hasApi, secure, userAgent })` → `'insecure' | 'ios' | 'android' | 'other' | null`:
    - `!secure` → `insecure`, checked first: a LAN http page may still have the API in Chromium;
    - else a user agent matching `/iPhone|iPad|iPod/` (or iPadOS's desktop UA with touch: accept the `/iPhone|iPad|iPod/` check only; don't sniff further) with no API → `ios`;
    - a user agent matching `/Android/` → `android`, even when the API exists, because `new Notification` throws there;
    - else no API → `other`;
    - else `null`.
  - `setupState({ enabled, permission, reason, pending })` → `'off' | 'pending' | 'on' | 'blocked' | 'unavailable'`:
    - unavailable whenever `reason` is non-null, **even unticked**, so the bar says N/A up front;
    - else unticked → `off`;
    - else denied → `blocked`;
    - else granted → `on`;
    - else → `pending`.
  - `browserFamily(userAgent)` → `'firefox' | 'safari' | 'chromium'`, for the blocked help line.
- **Labels:** the top-bar button uses `NOTIFY_LABEL[state]`, keeping the existing `· n NEW` suffix behaviour, plus `title={NOTIFY_BUTTON_TITLE}`.
- **Popover order:**
  1. `POPOVER_HEADING`
  2. `areaLine(states)`
  3. the toggle (`TOGGLE_LABEL`)
  4. the state block: `STATE_LINE.off`; or `pending` + the ALLOW NOTIFICATIONS button (kept). After 3 s pending, or when the request resolves `default`, also `STATE_LINE.pendingQuiet`; or `on` + **SEND TEST**; or `BLOCKED.head` + the family line + `BLOCKED.stuck`; or `UNAVAILABLE[reason]`
  5. the threshold fieldset (`THRESHOLD_LEGEND`; each option `THRESHOLD_COPY[t].label` with `hint` as muted small text under it; label and hint through `TaggedText` so SPC and MD get tips)
  6. `countLine(count)`
  7. `LIMITS`
- **SEND TEST:**
  - `engine.ts` gains `sendTest(): 'shown' | 'refused'` on the engine, plus a module-level `sendTestNotification()` that the control calls through the runtime. Keep the "engine is the only caller of the Notification API" rule.
  - It sends `TEST_NOTIFICATION` with tag `notify-test` immediately, ignoring visibility, the rate cap and the threshold.
  - A constructor throw marks the runtime unsupported. The control then shows `UNAVAILABLE.android` on Android, else `UNAVAILABLE.other`, and the label becomes N/A.
  - The control shows `TEST_RESULT.shown` or `TEST_RESULT.refused` in a `role="status"` line under the button.
  - The test notification is not counted and not recorded in `seen`.
- **The default threshold** becomes `'WARNINGS'` (`DEFAULT_PREFS`). A stored valid threshold still wins.
- **Overflow** uses `OVERFLOW.title(n)` / `OVERFLOW.body`.
- Keep everything else: one engine, permission only from a click, live re-reads, ADR-0012 focus and pressed styles.
- `notify.css`: muted hint text for the options, spacing for the new lines. Tokens only, no fixed widths. The popover must still fit 390 px.

## Acceptance
- [ ] `setupState.test.ts` covers every `unavailableReason` branch, with `insecure` winning over `android`; every `setupState` combination, including unticked + unavailable → `unavailable`; and `browserFamily`.
- [ ] `engine.test.ts` (fake io):
  - `sendTest` creates exactly one notification with the test title and tag, even while visible and inside the rate window, and doesn't change the count, `seen` or the rate slots;
  - a throwing constructor → `'refused'` and unsupported;
  - overflow uses the new title.
- [ ] `NotifyControl.test.tsx` (stub `Notification`, `isSecureContext`, `navigator.userAgent`), updated where labels changed:
  - each label;
  - the area line shows the AOI states;
  - pending shows ALLOW, and the quiet-prompt hint after the timer (fake timers);
  - granted shows SEND TEST, and clicking it shows `TEST_RESULT.shown`;
  - a throwing constructor shows the unavailable copy and N/A;
  - blocked shows the Chromium line for a Chrome UA and the Firefox line for a Firefox UA, plus `BLOCKED.stuck`;
  - insecure shows `UNAVAILABLE.insecure` with the box unticked;
  - `LIMITS` is always present;
  - the default threshold for fresh prefs is WARNINGS;
  - `SPC` in an option is an `abbr`.
- [ ] `set -o pipefail; npm run typecheck && npm run lint && npm test && npm run build:ui && ! grep -rnE "dangerouslySetInnerHTML|\.innerHTML\s*=" src` pass.
