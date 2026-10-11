// NWS zone geometry. Zone-based alerts (watches, flood watches) carry `geometry: null` and list
// their zones as `affectedZones` URLs; each zone GET returns the zone's own polygon.

const NWS_ORIGIN = 'https://api.weather.gov'
const PROXY_BASE = '/api/nws'

export type ZoneGeometry = GeoJSON.Polygon | GeoJSON.MultiPolygon

export interface ZoneShape {
  /** `<type>/<id>` from the URL, e.g. `county/GAC033`. Also the cache key. */
  key: string
  geometry: ZoneGeometry
}

/** Subset of the NWS zone GET response (`application/geo+json`) that we read. */
export interface NwsZoneResponse {
  id: string
  geometry: GeoJSON.Geometry | null
}

/** Rewrites an `affectedZones` URL onto the same-origin proxy so requests carry the project User-Agent. */
export function zoneUrlToProxy(url: string): string {
  return url.startsWith(NWS_ORIGIN) ? `${PROXY_BASE}${url.slice(NWS_ORIGIN.length)}` : url
}

/**
 * `<type>/<id>` from a zone URL: `https://api.weather.gov/zones/county/GAC033` → `county/GAC033`.
 * The type is part of the key because forecast and fire zones share ids (GAZ087).
 */
export function zoneKeyFromUrl(url: string): string {
  return url.split('/').slice(-2).join('/')
}

/** Pure: a zone response to a shape, or null when the zone has no usable polygon. */
export function normalizeZone(raw: NwsZoneResponse): ZoneShape | null {
  const g = raw.geometry
  if (!g || (g.type !== 'Polygon' && g.type !== 'MultiPolygon')) return null
  return { key: zoneKeyFromUrl(raw.id), geometry: g }
}
