// GOES-East infrared imagery. Primary: IEM tile cache (keyless XYZ). Fallback: nowCOAST WMS (EPSG:3857).
export type GoesSource = 'iem' | 'nowcoast'

export const GOES_ATTRIBUTION = 'GOES-East via IEM / NOAA'

export const GOES_REFRESH_MS = 10 * 60_000

const IEM_GOES_TILES =
  'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/goes_east_conus_ch13/{z}/{x}/{y}.png'

const NOWCOAST_WMS =
  'https://nowcoast.noaa.gov/geoserver/satellite/wms?service=WMS&version=1.1.1&request=GetMap' +
  '&layers=goes_longwave_imagery&styles=&format=image/png&transparent=true&srs=EPSG:3857' +
  '&width=256&height=256&bbox={bbox-epsg-3857}'

/** Tile URL template for a source. `cacheBust` appends a timestamp to defeat tile caching. */
export function goesTileUrl(source: GoesSource, cacheBust?: number): string {
  const base = source === 'iem' ? IEM_GOES_TILES : NOWCOAST_WMS
  if (cacheBust === undefined) return base
  return `${base}${source === 'iem' ? '?' : '&'}t=${cacheBust}`
}
