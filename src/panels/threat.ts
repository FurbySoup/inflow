import type { Alert } from '../types'
import { hazardCode, isPds, mostSevereTornado } from '../lib/hazards'
import { geometryBbox, remainingMs } from './alertGeometry'
import { alertInAoi, type AoiMatchTarget } from './aoiMatch'

export interface ThreatSummary {
  /** Active tornado warnings intersecting the AOI (expired ones are dropped, as in the alerts list). */
  count: number
  pdsCount: number
  /** Milliseconds until the soonest expiring active tornado warning. Null when none has an expiry. */
  nextExpiryMs: number | null
  /** The warning the threat button focuses: most severe, preferring one with polygon geometry so it can be focused. */
  target: Alert | null
}

/** Summarises the tornado warnings the threat button shows. Pure: `now` is passed in, so it can be tested. */
export function threatSummary(alerts: Alert[], aoi: AoiMatchTarget, now: number): ThreatSummary {
  const active = alerts.filter((a) => {
    if (hazardCode(a.event) !== 'TOR') return false
    if (!alertInAoi(a, aoi)) return false
    const left = remainingMs(a.expires, now)
    return left === null || left > 0
  })

  const expiries = active.flatMap((a) => {
    const left = remainingMs(a.expires, now)
    return left === null ? [] : [left]
  })

  const focusable = active.filter((a) => geometryBbox(a.geometry) !== null)
  return {
    count: active.length,
    pdsCount: active.filter((a) => isPds(a)).length,
    nextExpiryMs: expiries.length ? Math.min(...expiries) : null,
    target: mostSevereTornado(focusable) ?? mostSevereTornado(active),
  }
}
