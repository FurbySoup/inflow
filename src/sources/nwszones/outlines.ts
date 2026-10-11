import type { Alert } from '../../types'
import { zoneIdFromUrl, type ZoneShape } from './zones'

/** Zone-based alerts (geometry null) that touch one of the given states. */
export function zoneBasedAlerts(alerts: Alert[], states: string[]): Alert[] {
  return alerts.filter((a) => a.geometry === null && a.states.some((s) => states.includes(s)))
}

/**
 * County zone URLs only. An alert's affectedZones also list forecast and fire zones covering the
 * same area; drawing those on top of the counties would double every outline.
 */
export function countyZoneUrls(alert: Alert): string[] {
  return alert.zones.filter((url) => url.includes('/zones/county/'))
}

/** Pure: one feature per (alert, county) whose shape resolved. Zones that failed to load are skipped. */
export function buildOutlineFeatures(alerts: Alert[], shapes: Map<string, ZoneShape>): GeoJSON.Feature[] {
  const features: GeoJSON.Feature[] = []
  for (const alert of alerts) {
    for (const url of countyZoneUrls(alert)) {
      const shape = shapes.get(zoneIdFromUrl(url))
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

/** Every distinct county URL the alerts reference, for one batched shape lookup. */
export function allCountyZoneUrls(alerts: Alert[]): string[] {
  return [...new Set(alerts.flatMap(countyZoneUrls))]
}
