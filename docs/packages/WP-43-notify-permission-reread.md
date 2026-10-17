# WP-43 — NotifyControl re-reads the browser permission when opened
Wave 10 · Follows WP-35 · ADRs: 0012, 0019

## Goal
`NotifyControl` (`src/notify/NotifyControl.tsx`) syncs `Notification.permission` into prefs only once per page load. If the user changes the site permission in browser settings while the app is open (the BLOCKED text tells them to), the popover keeps showing the old state until reload. Re-read it whenever the popover opens, and when the tab becomes visible again (they come back from the settings page).

## Owns
`src/notify/NotifyControl.tsx` (+ `NotifyControl.test.tsx`).

## Forbidden
Everything else, including `src/notify/engine.ts`, `prefs.ts`, `src/state/notify.ts`, `src/ui/*`. Never call `Notification.requestPermission` outside a click (ADR-0019); this package only **reads** the permission.

## Verified facts (code on `main`, 2026-10-13)
- `browserPermission()` returns `Notification.permission`, or null when the API is absent. It never prompts.
- The mount effect does `if (live !== null && live !== getPrefs().permission) updatePrefs({ permission: live })`.
- The popover state is `open`, set from the NOTIFY button's `onClick`.
- The BLOCKED copy says "…then reopen this…". With this change, reopening really does refresh.

## Build
- Pull the existing read-and-sync into a local `syncPermission()` and call it:
  - on mount (as now);
  - when `open` becomes true;
  - on `visibilitychange` to visible (add and remove the listener in an effect).
- Prefs only change when the value differs, as now.
- Add a one-line comment for each trigger.

## Acceptance
- [ ] Tests (stub `Notification.permission` with a getter):
  - permission `denied` at mount; change the stub to `granted`; open the popover; the status shows on/allowed without a reload;
  - the same through a `visibilitychange` event;
  - `requestPermission` is never called by these paths.
- [ ] `set -o pipefail; npm run typecheck && npm run lint && npm test && npm run build:ui` pass.
