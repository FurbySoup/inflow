import type maplibregl from 'maplibre-gl'
import { useAoi } from '../state/aoi'
import {
  GOES_ATTRIBUTION,
  GOES_REFRESH_MS,
  goesSector,
  goesTileUrl,
  type GoesSector,
  type GoesSource,
} from '../sources/satellite/goes'
import type { MapLayer } from './layers'

// Which tile source is active. Switches once to nowCOAST if IEM tiles fail.
let active: GoesSource = 'iem'
// Which GOES sector is shown. Follows the AOI centre (GOES-West west of 105°W).
let sector: GoesSector = 'east'

/** Points the existing source at the current source and sector. Same source id, so draw order is kept. */
function applyTiles(map: maplibregl.Map, cacheBust?: number): void {
  const src = map.getSource('satellite') as maplibregl.RasterTileSource | undefined
  if (!src) return
  src.setTiles([goesTileUrl(active, sector, cacheBust)])
}

export const satelliteLayer: MapLayer = {
  id: 'satellite',
  label: 'GOES IR',
  add(map) {
    active = 'iem'
    sector = goesSector(useAoi.getState().bbox)
    map.addSource('satellite', {
      type: 'raster',
      tiles: [goesTileUrl(active, sector)],
      tileSize: 256,
      attribution: GOES_ATTRIBUTION,
    })
    map.addLayer({
      id: 'satellite',
      type: 'raster',
      source: 'satellite',
      paint: { 'raster-opacity': 0.55 },
    })
    map.on('error', (e: maplibregl.ErrorEvent & { sourceId?: string }) => {
      if (e.sourceId !== 'satellite' || active === 'nowcoast') return
      active = 'nowcoast'
      applyTiles(map, Date.now())
    })
    // Only the sector changes the tiles. Panning inside a sector leaves them alone.
    const unsubscribe = useAoi.subscribe((state) => {
      const next = goesSector(state.bbox)
      if (next === sector) return
      sector = next
      applyTiles(map)
    })
    map.once('remove', unsubscribe)
  },
  refreshMs: GOES_REFRESH_MS,
  // Bust the tile cache so the imagery stays current.
  refresh(map) {
    applyTiles(map, Date.now())
  },
}
