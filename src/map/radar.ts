import type maplibregl from 'maplibre-gl'
import { IEM_RADAR_TILES, RADAR_REFRESH_MS } from '../sources/radar/iem'
import type { MapLayer } from './layers'

export const radarLayer: MapLayer = {
  id: 'radar',
  label: 'NEXRAD Reflectivity',
  add(map) {
    map.addSource('radar', { type: 'raster', tiles: [IEM_RADAR_TILES], tileSize: 256 })
    map.addLayer({ id: 'radar', type: 'raster', source: 'radar', paint: { 'raster-opacity': 0.7 } })
  },
  refreshMs: RADAR_REFRESH_MS,
  // Bust the tile cache so the composite stays current.
  refresh(map) {
    const src = map.getSource('radar') as maplibregl.RasterTileSource | undefined
    src?.setTiles([`${IEM_RADAR_TILES}?t=${Date.now()}`])
  },
}
