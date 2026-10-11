// Pure clock helpers for the top bar. Every function takes `now`, so tests can pin an instant.

const labelFormatters = new Map<string, Intl.DateTimeFormat>()
const wallFormatters = new Map<string, Intl.DateTimeFormat>()

function labelFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = labelFormatters.get(timeZone)
  if (!f) {
    // hourCycle h23 (not hour12: false): avoids "24:00" at midnight in some engines.
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    })
    labelFormatters.set(timeZone, f)
  }
  return f
}

function wallFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = wallFormatters.get(timeZone)
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    })
    wallFormatters.set(timeZone, f)
  }
  return f
}

/** Wall-clock time in a zone with its short name, e.g. "14:02 EDT". Minutes only: UTC carries the seconds, and the top bar must fit one row. */
export function zoneLabel(now: Date, timeZone: string): string {
  const parts = labelFormatter(timeZone).formatToParts(now)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return `${get('hour')}:${get('minute')} ${get('timeZoneName')}`
}

/** UTC offset of a zone at `now`, in minutes (e.g. -240 for EDT). */
export function utcOffsetMinutes(now: Date, timeZone: string): number {
  const parts = wallFormatter(timeZone).formatToParts(now)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? NaN)
  const wallMs = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  const nowMs = Math.floor(now.getTime() / 1000) * 1000
  return Math.round((wallMs - nowMs) / 60_000)
}

/** True when two zones are at the same UTC offset at `now`. */
export function sameOffset(now: Date, zoneA: string, zoneB: string): boolean {
  return utcOffsetMinutes(now, zoneA) === utcOffsetMinutes(now, zoneB)
}

/** The device's IANA zone, read once. */
export const DEVICE_ZONE: string = Intl.DateTimeFormat().resolvedOptions().timeZone
