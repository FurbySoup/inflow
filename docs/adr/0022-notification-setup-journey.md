# 0022. Notification setup: a test send, honest states, warnings by default
Status: Accepted
Date: 2026-10-17
Amends: [ADR-0019](0019-browser-notifications.md)

## Context
A three-reviewer audit of the first-time notification journey (2026-10-17) found that people could not tell whether notifications worked. The maintainer hit the same problems testing it:
- System notifications only appear while the tab is hidden, so testing with the tab in front looks broken.
- There was no way to test, so "NOTIFY ON" could be false. The OS can hide notifications (Focus, Do Not Disturb, the browser switched off in OS settings), and Android Chrome grants permission but `new Notification()` throws. The first real warning would be lost.
- Every "can't work here" case showed the same "blocked, check site settings" text, which can't fix any of them:
  - an http page on a LAN address (not a secure context);
  - an extension or browser-wide block;
  - iOS (no web notifications without an installed app).
- The default threshold included watches and mesoscale discussions, which is more than "tell me about warnings".

## Decision
- **SEND TEST.** It sends one system notification immediately, whatever the tab's visibility. It goes through the engine (`engine.sendTest()`), which stays the only caller of the Notification API.
  - If the constructor throws, the browser is marked unavailable straight away.
  - The result text says what the browser did, and always points at the OS settings, because the page can't know whether the OS showed it.
- **Setup states:** `off`, `pending` (ticked, waiting for permission), `on`, `blocked` (denied), and `unavailable` with a reason:
  - `insecure`: `!isSecureContext`;
  - `ios`: no API on iPhone/iPad;
  - `android`: an Android user agent, treated as unavailable up front;
  - `other`: no API.
  - Each state has its own fix text, in `src/notify/notifyCopy.ts`.
- **Default threshold is `WARNINGS`:** tornado, severe thunderstorm and flash flood warnings. Watches, MDs, risk and chasers are opt-in. Stored prefs keep the user's choice.
- **The popover states the limits plainly:**
  - hidden-tab only;
  - nothing when the tab is closed or the computer is asleep;
  - the area is the map view;
  - chasers are nationwide and can lag.
- The overflow notice reads "N MORE UPDATES".

## Consequences
- A user can prove notifications work in ten seconds, and the common failure causes are named in the UI.
- Android and iOS stay unsupported until a later release adds an installable app with a service worker (post-1.0).
