import type { NotifyEvent } from '../state/notify'
import type { Alert } from '../types'
import type { WatchFeature } from '../sources/iemspc/watches'
import type { MesoscaleFeature } from '../sources/iemspc/mesoscale'
import { alertInAoi, type AoiMatchTarget } from '../panels/aoiMatch'
import { geometryBbox } from '../panels/alertGeometry'
import { zuluTime } from '../panels/newAlerts'
import { highestCategory, RISK_ORDER, type RiskCategory } from '../panels/spcRisk'
import { hazardCode, isWatch } from '../lib/hazards'
import { bboxIntersectsGeometry } from '../lib/geo'

/**
 * Pure diffs behind the notification triggers (ADR-0019). Each takes `seen`, the keys already known: null means the
 * first call after load, which seeds and returns nothing, so existing products never notify. The caller remembers the
 * keys of the whole feed (see `remember`), not only the in-AOI ones, as the toasts do.
 */
export type Seen = ReadonlySet<string> | null

/** Keys of everything in a feed, for `remember`. */
export const nwsKeys = (alerts: Alert[]): string[] => alerts.map((a) => a.eventKey)
export const watchKeys = (watches: WatchFeature[]): string[] => watches.map((w) => `spc-watch:${w.properties.num}`)
export const mdKeys = (mds: MesoscaleFeature[]): string[] => mds.map((m) => `spc-md:${m.properties.num}`)

/** `seen` plus the given keys. A new Set, so the caller can keep the previous one. */
export function remember(seen: Seen, keys: Iterable<string>): Set<string> {
  const next = new Set(seen ?? [])
  for (const key of keys) next.add(key)
  return next
}

function unseen<T>(seen: Seen, items: readonly T[], keyOf: (item: T) => string): T[] {
  if (seen === null) return []
  return items.filter((item) => !seen.has(keyOf(item)))
}

/** The first area named in an NWS areaDesc (`Bulloch, GA; Screven, GA` → `Bulloch, GA`). */
const firstArea = (areaDesc: string): string => areaDesc.split(';')[0]?.trim() ?? ''

/**
 * In-AOI NWS warnings and advisories with an unseen eventKey (VTEC, so an update never re-notifies). Cancels never
 * notify. Watches (TOA/SVA) are left to `diffSpcWatches`, which covers the same watch with a polygon, so one watch
 * never notifies twice.
 */
export function diffNwsAlerts(seen: Seen, alerts: Alert[], aoi: AoiMatchTarget, now: number): NotifyEvent[] {
  const candidates = alerts.filter(
    (a) => a.messageType !== 'Cancel' && !isWatch(a.event) && alertInAoi(a, aoi),
  )
  return unseen(seen, candidates, (a) => a.eventKey).map((a) => {
    const area = firstArea(a.areaDesc)
    const until = zuluTime(a.expires)
    const bbox = geometryBbox(a.geometry)
    const event: NotifyEvent = {
      kind: 'nws-alert',
      key: a.eventKey,
      title: area ? `${a.event.toUpperCase()} · ${area}` : a.event.toUpperCase(),
      body: until ? `${area || 'Your area'} until ${until}.` : `${area || 'Your area'}.`,
      at: now,
      level: hazardCode(a.event),
    }
    if (bbox) event.focus = { id: a.id, bbox }
    return event
  })
}

/** SPC watch boxes whose polygon meets the AOI, not yet seen. */
export function diffSpcWatches(seen: Seen, watches: WatchFeature[], aoi: Pick<AoiMatchTarget, 'bbox'>, now: number): NotifyEvent[] {
  const candidates = watches.filter((w) => bboxIntersectsGeometry(aoi.bbox, w.geometry))
  return unseen(seen, candidates, (w) => `spc-watch:${w.properties.num}`).map((w) => {
    const until = zuluTime(w.properties.expires)
    const bbox = geometryBbox(w.geometry)
    const event: NotifyEvent = {
      kind: 'spc-watch',
      key: `spc-watch:${w.properties.num}`,
      title: `${w.properties.kind === 'TOR' ? 'TORNADO' : 'SEVERE THUNDERSTORM'} WATCH ${w.properties.num}`,
      body: until ? `Crosses your area of interest until ${until}.` : 'Crosses your area of interest.',
      at: now,
      level: w.properties.kind === 'TOR' ? 'TOA' : 'SVA',
    }
    if (bbox) event.focus = { id: w.properties.label, bbox }
    return event
  })
}

/** SPC mesoscale discussions whose polygon meets the AOI, not yet seen. */
export function diffSpcMds(seen: Seen, mds: MesoscaleFeature[], aoi: Pick<AoiMatchTarget, 'bbox'>, now: number): NotifyEvent[] {
  const candidates = mds.filter((m) => bboxIntersectsGeometry(aoi.bbox, m.geometry))
  return unseen(seen, candidates, (m) => `spc-md:${m.properties.num}`).map((m) => {
    const until = zuluTime(m.properties.expires)
    const bbox = geometryBbox(m.geometry)
    const event: NotifyEvent = {
      kind: 'spc-md',
      key: `spc-md:${m.properties.num}`,
      title: `MESOSCALE DISCUSSION ${m.properties.num}`,
      body: until ? `Crosses your area of interest until ${until}.` : 'Crosses your area of interest.',
      at: now,
      level: 'MD',
    }
    if (bbox) event.focus = { id: m.properties.label, bbox }
    return event
  })
}

/** Day 1 issuance time (`ISSUE_ISO`) of a set of outlook features, or null when there are none. */
export function outlookIssue(features: GeoJSON.Feature[]): string | null {
  const issue = features[0]?.properties?.ISSUE_ISO
  return typeof issue === 'string' ? issue : null
}

const rankOf = (c: RiskCategory | null): number => (c === null ? -1 : RISK_ORDER.indexOf(c))

/**
 * Day 1 risk upgrade for the AOI: fires only when the issuance changed and the highest category in the AOI rose.
 * `prev` is the last issuance the caller saw (null on first load, which seeds). Same issuance or a downgrade → nothing.
 */
export function diffRiskUpgrade(
  prev: GeoJSON.Feature[] | null,
  next: GeoJSON.Feature[],
  aoi: Pick<AoiMatchTarget, 'bbox'>,
  now: number,
): NotifyEvent[] {
  if (prev === null) return []
  const issue = outlookIssue(next)
  if (issue === null || issue === outlookIssue(prev)) return []
  const before = highestCategory(prev, aoi.bbox)
  const after = highestCategory(next, aoi.bbox)
  if (rankOf(after) <= rankOf(before) || after === null) return []
  return [
    {
      kind: 'spc-risk',
      key: `spc-risk:${issue}`,
      title: `SPC D1 UPGRADED TO ${after}`,
      body: `The Day 1 outlook for your area of interest rose from ${before ?? 'no risk'} to ${after}.`,
      at: now,
      level: after,
    },
  ]
}
