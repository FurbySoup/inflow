import type { Alert } from '../../types'
import { zoneKeyFromUrl, type ZoneShape } from './zones'

/** Zone-based alerts (geometry null) that touch one of the given states. */
export function zoneBasedAlerts(alerts: Alert[], states: string[]): Alert[] {
  return alerts.filter((a) => a.geometry === null && a.states.some((s) => states.includes(s)))
}

/**
 * The zones to outline for one alert: its county zones if it has any, otherwise its forecast zones
 * (flood watches list only forecast zones). Fire zones are never used: they repeat forecast-zone shapes.
 */
export function outlineZoneUrls(alert: Alert): string[] {
  const counties = alert.zones.filter((url) => url.includes('/zones/county/'))
  if (counties.length > 0) return counties
  return alert.zones.filter((url) => url.includes('/zones/forecast/'))
}

/** Pure: one feature per (alert, zone) whose shape resolved. Zones that failed to load are skipped. */
export function buildOutlineFeatures(alerts: Alert[], shapes: Map<string, ZoneShape>): GeoJSON.Feature[] {
  const features: GeoJSON.Feature[] = []
  for (const alert of alerts) {
    for (const url of outlineZoneUrls(alert)) {
      const shape = shapes.get(zoneKeyFromUrl(url))
      if (!shape) continue
      features.push({
        type: 'Feature',
        geometry: shape.geometry,
        properties: { alertId: alert.id, event: alert.event, severity: alert.severity },
      })
    }
  }
  return features
}

/** Every distinct outline zone URL the alerts reference, for one batched shape lookup. */
export function allOutlineZoneUrls(alerts: Alert[]): string[] {
  return [...new Set(alerts.flatMap(outlineZoneUrls))]
}
