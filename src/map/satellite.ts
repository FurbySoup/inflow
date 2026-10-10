import type maplibregl from 'maplibre-gl'
import { GOES_ATTRIBUTION, GOES_REFRESH_MS, goesTileUrl, type GoesSource } from '../sources/satellite/goes'
import type { MapLayer } from './layers'

// Which tile source is active. Switches once to nowCOAST if IEM tiles fail.
let active: GoesSource = 'iem'

export const satelliteLayer: MapLayer = {
  id: 'satellite',
  label: 'GOES-East IR',
  add(map) {
    active = 'iem'
    map.addSource('satellite', {
      type: 'raster',
      tiles: [goesTileUrl(active)],
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
      const src = map.getSource('satellite') as maplibregl.RasterTileSource | undefined
      src?.setTiles([goesTileUrl(active, Date.now())])
    })
  },
  refreshMs: GOES_REFRESH_MS,
  // Bust the tile cache so the imagery stays current.
  refresh(map) {
    const src = map.getSource('satellite') as maplibregl.RasterTileSource | undefined
    src?.setTiles([goesTileUrl(active, Date.now())])
  },
}
