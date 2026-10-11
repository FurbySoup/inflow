import type { Bbox } from '../../types'

// GOES infrared imagery. Primary: IEM tile cache (keyless XYZ). Fallback: nowCOAST WMS (EPSG:3857).
// Two CONUS sectors: GOES-East over most of the country, GOES-West west of 105°W where GOES-East is oblique.
// Alaska and Hawaii fall outside both CONUS sectors and are not covered (out of scope for v1).
export type GoesSource = 'iem' | 'nowcoast'
export type GoesSector = 'east' | 'west'

export const GOES_REFRESH_MS = 10 * 60_000

/** Centre longitude west of this uses GOES-West. */
const WEST_OF_LNG = -105

const IEM_TILE_BASE = 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/'

const IEM_LAYERS: Record<GoesSector, string> = {
  east: 'goes_east_conus_ch13',
  west: 'goes_west_conus_ch13',
}

const NOWCOAST_WMS =
  'https://nowcoast.noaa.gov/geoserver/satellite/wms?service=WMS&version=1.1.1&request=GetMap' +
  '&layers=goes_longwave_imagery&styles=&format=image/png&transparent=true&srs=EPSG:3857' +
  '&width=256&height=256&bbox={bbox-epsg-3857}'

/** Pure: the sector whose imagery suits the AOI, from its centre longitude. */
export function goesSector(bbox: Bbox): GoesSector {
  const centreLng = (bbox.west + bbox.east) / 2
  return centreLng < WEST_OF_LNG ? 'west' : 'east'
}

/** Tile URL template for a source and sector. `cacheBust` appends a timestamp to defeat tile caching. */
export function goesTileUrl(source: GoesSource, sector: GoesSector, cacheBust?: number): string {
  if (source === 'nowcoast') {
    return cacheBust === undefined ? NOWCOAST_WMS : `${NOWCOAST_WMS}&t=${cacheBust}`
  }
  const base = `${IEM_TILE_BASE}${IEM_LAYERS[sector]}/{z}/{x}/{y}.png`
  return cacheBust === undefined ? base : `${base}?t=${cacheBust}`
}

/** Attribution string shown by MapLibre for the sector in use. */
export function goesAttribution(sector: GoesSector): string {
  return sector === 'west' ? 'GOES-West via IEM / NOAA' : 'GOES-East via IEM / NOAA'
}
