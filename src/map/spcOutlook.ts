import type maplibregl from 'maplibre-gl'
import { spcOutlook } from '../sources/spc/outlook'
import { DEFAULT_AOI } from '../state/aoi'
import type { MapLayer } from './layers'

const SOURCE_ID = 'spc-outlook'

const EMPTY: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

async function load(map: maplibregl.Map) {
  const src = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined
  if (!src) return
  // On failure keep the last good outlook on the map.
  try {
    const raw = await spcOutlook.fetch(DEFAULT_AOI)
    src.setData({ type: 'FeatureCollection', features: spcOutlook.normalize(raw) })
  } catch {
    // keep previous data
  }
}

export const spcOutlookLayer: MapLayer = {
  id: SOURCE_ID,
  label: 'SPC Day 1 Outlook',
  add(map) {
    map.addSource(SOURCE_ID, { type: 'geojson', data: EMPTY })
    map.addLayer({
      id: SOURCE_ID,
      type: 'fill',
      source: SOURCE_ID,
      paint: { 'fill-color': ['get', 'fill'], 'fill-opacity': 0.18 },
    })
    map.addLayer({
      id: `${SOURCE_ID}-line`,
      type: 'line',
      source: SOURCE_ID,
      paint: { 'line-color': ['get', 'stroke'], 'line-width': 1 },
    })
    void load(map)
  },
  refreshMs: spcOutlook.refreshMs,
  refresh(map) {
    void load(map)
  },
}
