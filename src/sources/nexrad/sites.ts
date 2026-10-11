import type { LngLat } from '../../types'

// IEM's NEXRAD site list (CORS `*`, ~86 KB). Sites do not move, so it is fetched once per session.
export const NEXRAD_SITES_URL = 'https://mesonet.agron.iastate.edu/geojson/network/NEXRAD.geojson'

/** An online NEXRAD radar. `sid` is IEM's 3-letter id, which is the ICAO id without its K prefix in the lower 48. */
export interface NexradSite {
  sid: string
  name: string
  location: LngLat
  /** Contiguous US. Only these have a K-prefixed ICAO id that WeatherWise can open. */
  lower48: boolean
}

export interface NexradFeature {
  geometry: { type: 'Point'; coordinates: [number, number] } | null
  properties: {
    sid: string
    sname: string
    // IEM leaves these null for non-US sites or unset fields, so read them defensively.
    state: string | null
    country: string | null
    online: boolean
  }
}

export interface NexradSitesResponse {
  features: NexradFeature[]
}

// US territories and Alaska/Hawaii: outside the lower 48 even though their country is US.
const OUTSIDE_LOWER_48 = new Set(['AK', 'HI', 'PR', 'GU', 'VI', 'AS', 'MP'])

/** Online sites only. Features without a point geometry are skipped. */
export function normalizeSites(raw: NexradSitesResponse): NexradSite[] {
  const sites: NexradSite[] = []
  for (const f of raw.features) {
    const p = f.properties
    if (!p.online || !f.geometry) continue
    const [lng, lat] = f.geometry.coordinates
    const state = (p.state ?? '').trim()
    const country = (p.country ?? '').trim()
    sites.push({
      sid: p.sid,
      name: p.sname,
      location: [lng, lat],
      lower48: country === 'US' && state !== '' && !OUTSIDE_LOWER_48.has(state),
    })
  }
  return sites
}

let sitesCache: Promise<NexradSite[]> | null = null

/** The online NEXRAD sites. Cached for the session; a failed fetch is retried on the next call. */
export function loadNexradSites(): Promise<NexradSite[]> {
  if (!sitesCache) {
    sitesCache = fetch(NEXRAD_SITES_URL, { headers: { Accept: 'application/geo+json' } })
      .then((res) => {
        if (!res.ok) throw new Error(`IEM NEXRAD sites ${res.status}`)
        return res.json() as Promise<NexradSitesResponse>
      })
      .then(normalizeSites)
      .catch((err: unknown) => {
        sitesCache = null
        throw err
      })
  }
  return sitesCache
}

const EARTH_RADIUS_KM = 6371

/** Great-circle distance between two lng/lat points, in km. */
export function greatCircleKm(a: LngLat, b: LngLat): number {
  const rad = Math.PI / 180
  const dLat = (b[1] - a[1]) * rad
  const dLng = (b[0] - a[0]) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** The site closest to `at`, or null when there are no sites. */
export function nearestSite(sites: readonly NexradSite[], at: LngLat): NexradSite | null {
  let best: NexradSite | null = null
  let bestKm = Infinity
  for (const site of sites) {
    const km = greatCircleKm(site.location, at)
    if (km < bestKm) {
      best = site
      bestKm = km
    }
  }
  return best
}

/** WeatherWise deep link to the site's N0S velocity (ICAO `K` + sid). Null outside the lower 48. */
export function weatherWiseUrl(site: NexradSite): string | null {
  if (!site.lower48) return null
  const [lng, lat] = site.location
  return `https://web.weatherwise.app/#m=RADAR&rt=K${site.sid}&rp=N0S&map=8/${lat}/${lng}`
}
