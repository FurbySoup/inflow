// Every user-facing string of the notification setup (WP-55). Orchestrator-written from a three-reviewer audit of the
// first-time journey and from the code (engine.ts, prefs.ts, triggers.ts): packages render these and never edit them.
// Honest by design: notifications are a convenience, never a safety guarantee, and never say "all clear".

import type { Threshold } from './prefs'

/** Top-bar button label per setup state. */
export const NOTIFY_LABEL = {
  off: 'NOTIFY OFF',
  pending: 'NOTIFY · ALLOW?',
  on: 'NOTIFY ON',
  blocked: 'NOTIFY BLOCKED',
  unavailable: 'NOTIFY N/A',
} as const

export const NOTIFY_BUTTON_TITLE = 'Browser notifications for warnings in the map view'

export const POPOVER_HEADING = 'NOTIFICATIONS'

export const TOGGLE_LABEL = 'Send browser notifications'

/** Shown above the options: the area is whatever the map shows, so it moves when the map does. */
export const areaLine = (states: string) => `Area: ${states} (the map view; moving the map changes it)`

/** One line per state, under the toggle. */
export const STATE_LINE = {
  off: 'Off. Tornado warnings in view still pop up on screen.',
  pending: 'Waiting for your browser. Choose Allow in its prompt.',
  pendingQuiet:
    'No prompt? Look for a bell icon with a line through it at the right of the address bar, and choose Allow.',
  on: 'On. Press SEND TEST to check this computer shows them.',
} as const

/** Why notifications can't work here, with the fix. Chosen by `unavailableReason()` in the control. */
export const UNAVAILABLE = {
  insecure:
    'Browsers only allow notifications on secure pages. Open INFLOW as http://localhost:8080 on the computer running it. Opened over your network (http://<address>), notifications can’t work; on-screen alerts still do.',
  ios: 'iPhone and iPad only allow web notifications from installed apps, and INFLOW can’t be installed yet. Use a desktop browser for notifications.',
  android:
    'Android browsers only allow notifications from installed apps, and INFLOW can’t be installed yet. Use a desktop browser for notifications.',
  other: 'This browser can’t show notifications. On-screen alerts still work.',
} as const

/** Blocked: the general fix first, then the browser-specific path, then the two causes that site settings can't fix. */
export const BLOCKED = {
  head: 'Your browser is blocking notifications for this site.',
  chromium:
    'Click the icon left of the address › Site settings › Notifications › Allow, then reload.',
  firefox: 'Click the bell icon with a line through it in the address bar › Allow, then reload.',
  safari: 'Safari › Settings › Websites › Notifications › allow this site, then reload.',
  stuck:
    'Greyed out, or “Blocked by an extension”? An extension or the browser’s own notification setting is blocking it: turn that extension off, or allow sites to ask in the browser’s notification settings.',
} as const

export const THRESHOLD_LEGEND = 'Notify me about'

/** Cumulative options: each includes everything above it. `hint` is the plain-English meaning, shown as small text. */
export const THRESHOLD_COPY: Record<Threshold, { label: string; hint: string }> = {
  TOR: { label: 'Tornado warnings', hint: 'A tornado is happening or about to.' },
  WARNINGS: {
    label: '+ Severe thunderstorm and flash flood warnings',
    hint: 'Damaging hail, wind or flooding now.',
  },
  WATCHES: {
    label: '+ Watches and mesoscale discussions',
    hint: 'Storms possible in the next hours. MD: an SPC heads-up before a watch.',
  },
  RISK: { label: '+ SPC Day 1 risk raised', hint: 'Today’s outlook level went up in the map view.' },
  CHASERS: {
    label: '+ Chasers going live',
    hint: 'Any chaser on the list, anywhere, not just the map view. Can lag up to an hour while hidden.',
  },
}

export const TEST_BUTTON = 'SEND TEST'

export const TEST_NOTIFICATION = {
  title: 'INFLOW TEST',
  body: 'Notifications work. Real ones look like this.',
} as const

/** Result of SEND TEST. `shown` is honest: the browser handed it over, but the OS can still hide it. */
export const TEST_RESULT = {
  shown:
    'SENT. Didn’t see it? Check that notifications are on for your browser (Windows: Settings › System › Notifications; macOS: System Settings › Notifications) and that Do Not Disturb or Focus is off.',
  refused: 'Your browser refused it. Notifications won’t work in this browser.',
} as const

/** Always visible at the bottom of the popover: the limits, plainly. */
export const LIMITS =
  'Notifications appear only while this tab is in the background or minimised; while you’re looking at it, warnings show on screen instead. Nothing arrives with the tab or browser closed or the computer asleep. At most one every 20 seconds. Not for life-safety decisions: keep official alerts on your phone.'

/** The in-app count of matching items that arrived while the tab was in view. */
export const countLine = (n: number) => `${n} new while this tab was in view`

/** Overflow notification when more items arrive than the rate cap allows. */
export const OVERFLOW = {
  title: (n: number) => `${n} MORE UPDATES`,
  body: 'Open INFLOW to see them.',
} as const
