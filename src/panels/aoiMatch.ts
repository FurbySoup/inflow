import { bboxIntersectsGeometry } from '../lib/geo'
import type { Alert, Bbox } from '../types'

/** The part of the AOI an alert is matched against (see `useAoi`). */
export interface AoiMatchTarget {
  bbox: Bbox
  states: readonly string[]
}

/**
 * True when an alert belongs to the AOI. A storm-based warning (polygon) matches only when its polygon shares area
 * with the bbox, so a TOR in the same state but elsewhere stays out. A zone-based alert (geometry null, mostly watches)
 * matches by state.
 */
export function alertInAoi(alert: Pick<Alert, 'geometry' | 'states'>, aoi: AoiMatchTarget): boolean {
  if (alert.geometry === null) return alert.states.some((s) => aoi.states.includes(s))
  return bboxIntersectsGeometry(aoi.bbox, alert.geometry)
}
