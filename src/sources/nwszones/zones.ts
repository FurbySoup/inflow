// NWS zone geometry. Zone-based alerts (watches, flood watches) carry `geometry: null` and list
// their zones as `affectedZones` URLs; each zone GET returns the zone's own polygon.

const NWS_ORIGIN = 'https://api.weather.gov'
const PROXY_BASE = '/api/nws'

export type ZoneGeometry = GeoJSON.Polygon | GeoJSON.MultiPolygon

export interface ZoneShape {
  /** Zone id from the URL, e.g. `GAC033`. Also the cache key. */
  id: string
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

/** Last path segment of a zone URL: `https://api.weather.gov/zones/county/GAC033` → `GAC033`. */
export function zoneIdFromUrl(url: string): string {
  return url.slice(url.lastIndexOf('/') + 1)
}

/** Pure: a zone response to a shape, or null when the zone has no usable polygon. */
export function normalizeZone(raw: NwsZoneResponse): ZoneShape | null {
  const g = raw.geometry
  if (!g || (g.type !== 'Polygon' && g.type !== 'MultiPolygon')) return null
  return { id: zoneIdFromUrl(raw.id), geometry: g }
}
