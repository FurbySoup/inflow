import type { Alert } from '../types'
import { hazardCode } from '../lib/hazards'

/** Toasts stacked at once; a new one past this drops the oldest. */
export const MAX_TOASTS = 3

/**
 * Tornado warnings (and emergencies, which are TOR events with a catastrophic damage threat) that are new in the AOI.
 * `seen` is the set of ids already known; null means the first call after load: it seeds nothing and returns [].
 * Remember what was seen with `rememberTornadoWarnings`, so existing warnings never toast.
 */
export function diffNewTornadoWarnings(
  seen: ReadonlySet<string> | null,
  alerts: Alert[],
  aoiStates: readonly string[],
): Alert[] {
  if (seen === null) return []
  return alerts.filter(
    (a) =>
      hazardCode(a.event) === 'TOR' &&
      !seen.has(a.id) &&
      a.states.some((s) => aoiStates.includes(s)),
  )
}

/** Ids to remember after a check: everything already seen plus every tornado warning in the feed, whatever its region. */
export function rememberTornadoWarnings(seen: ReadonlySet<string> | null, alerts: Alert[]): Set<string> {
  const next = new Set(seen ?? [])
  for (const a of alerts) if (hazardCode(a.event) === 'TOR') next.add(a.id)
  return next
}

/** Keeps the newest `max` entries of an arrival-ordered list (oldest first). */
export function capStack<T>(items: readonly T[], max: number = MAX_TOASTS): T[] {
  return items.length > max ? items.slice(items.length - max) : [...items]
}

/** UTC clock label for an ISO time, e.g. `21:46Z`. Null when absent or unparseable. */
export function zuluTime(iso: string | null): string | null {
  if (!iso) return null
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) return null
  return `${new Date(ms).toISOString().slice(11, 16)}Z`
}
