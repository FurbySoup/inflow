# 0019. Browser notifications via one engine and a notify bus
Status: Accepted
Date: 2026-10-11

## Context
A chaser leaves INFLOW open in a background tab and needs to know when something changes in their area: a new NWS warning, an SPC watch or mesoscale discussion, a risk upgrade, or a regular chaser going live. v1 has no server, so there is no push while the tab is closed (that needs the v2 Worker: cron plus Web Push, see the roadmap).

## Decision
- **The bus:** `src/state/notify.ts` (`emitNotify`, `subscribeNotify`, `NotifyEvent`).
  - Sources that detect something new emit an event with a stable `key`.
  - Exactly one **engine** subscribes and delivers.
  - Emitters never call the Notification API, and the engine never fetches.
- **Delivery:**
  - A system `Notification` only while `document.visibilityState === 'hidden'`. While the tab is visible, the in-app signals already exist (TOR toasts, threat button, LEDs), and the engine shows a count on its top-bar control.
  - `tag` = `key` and `renotify: false`, so an update replaces rather than stacks.
  - Clicking a notification focuses the window and, when the event has `focus`, the map.
- **Permission:**
  - Requested only from a click on the top-bar control, never on load.
  - A denial is remembered and shown ("BLOCKED IN BROWSER"); we never ask again unprompted.
- **De-dupe and rate:**
  - Seen keys persist in localStorage for 48 h.
  - Each source seeds on first load and never notifies what already existed.
  - At most 1 notification per 20 s and 10 per hour; overflow collapses into one "N MORE IN AOI" notification.
- **Threshold:** a user setting with these steps:
  - TOR only;
  - plus SVR, FFW;
  - plus watches and MDs;
  - plus SPC risk upgrades;
  - plus chasers going live.
  - Default: TOR + SVR + FFW + watches.
- **Polling while hidden:** the engine's sources use `SourceAdapter.background` (prep P8b). Only what notifications need polls in the background.
- **Voice (HANDOFF §1):** only NWS products are called alerts, watches or warnings. A chaser event reads `CHASER LIVE · <NAME>`, and an SPC upgrade reads `SPC D1 UPGRADED TO ENH`.

## Consequences
- Nothing fires with the tab closed. That's stated in the control's help text, and closing it is a v2 Worker job.
- Browsers throttle background timers (about 1 per minute in Chrome). The 60 s NWS cadence fits; liveness round-robin slows down while hidden.
- Adding a trigger is additive: emit to the bus, add a threshold step if needed.
