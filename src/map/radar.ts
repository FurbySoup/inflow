import type maplibregl from 'maplibre-gl'
import { RADAR_REFRESH_MS } from '../sources/radar/iem'
import { FRAME_OFFSETS_MIN, frameSourceId, frameTileUrl } from '../sources/radar/frames'
import { fetchRadarValidTime } from '../sources/radar/valid'
import { RadarLoopControl } from './radarLoop'
import type { MapLayer } from './layers'

const FRAME_OPACITY = 0.7
const controls = new WeakMap<maplibregl.Map, RadarLoopControl>()

function refreshValidTime(map: maplibregl.Map): void {
  const control = controls.get(map)
  if (!control) return
  // On failure keep the last known time; the frame label simply stays as it was.
  fetchRadarValidTime()
    .then((ms) => control.setValidTime(ms))
    .catch(() => {})
}

export const radarLayer: MapLayer = {
  id: 'radar',
  label: 'NEXRAD Reflectivity',
  add(map) {
    const newest = FRAME_OFFSETS_MIN.length - 1
    FRAME_OFFSETS_MIN.forEach((offset, i) => {
      const id = frameSourceId(offset)
      map.addSource(id, { type: 'raster', tiles: [frameTileUrl(offset)], tileSize: 256 })
      map.addLayer({
        id,
        type: 'raster',
        source: id,
        paint: { 'raster-opacity': i === newest ? FRAME_OPACITY : 0 },
      })
    })
    const control = new RadarLoopControl()
    controls.set(map, control)
    map.addControl(control, 'bottom-left')
    refreshValidTime(map)
  },
  refreshMs: RADAR_REFRESH_MS,
  // Bust every frame's tile cache so the composite stays current, and re-read the valid time.
  refresh(map) {
    const bust = Date.now()
    for (const offset of FRAME_OFFSETS_MIN) {
      const src = map.getSource(frameSourceId(offset)) as maplibregl.RasterTileSource | undefined
      src?.setTiles([frameTileUrl(offset, bust)])
    }
    refreshValidTime(map)
  },
}
