import type maplibregl from 'maplibre-gl'
import { spcMesoscale } from '../sources/iemspc/mesoscale'
import { DEFAULT_AOI } from '../state/aoi'
import { LABEL_HALO, MESOSCALE } from './mapStyle'
import type { MapLayer } from './layers'

const SOURCE_ID = 'spc-md'
const COLOR = MESOSCALE

const EMPTY: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

async function load(map: maplibregl.Map) {
  const src = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined
  if (!src) return
  // On failure keep the last good discussions on the map.
  try {
    const raw = await spcMesoscale.fetch(DEFAULT_AOI)
    src.setData({ type: 'FeatureCollection', features: spcMesoscale.normalize(raw) })
  } catch {
    // keep previous data
  }
}

export const spcMesoscaleLayer: MapLayer = {
  id: SOURCE_ID,
  label: 'SPC Mesoscale Discussions',
  add(map) {
    map.addSource(SOURCE_ID, { type: 'geojson', data: EMPTY })
    map.addLayer({
      id: `${SOURCE_ID}-fill`,
      type: 'fill',
      source: SOURCE_ID,
      paint: { 'fill-color': COLOR, 'fill-opacity': 0.06 },
    })
    map.addLayer({
      id: `${SOURCE_ID}-line`,
      type: 'line',
      source: SOURCE_ID,
      paint: { 'line-color': COLOR, 'line-width': 1, 'line-dasharray': [3, 2] },
    })
    map.addLayer({
      id: `${SOURCE_ID}-label`,
      type: 'symbol',
      source: SOURCE_ID,
      layout: {
        'text-field': ['get', 'label'],
        'text-font': ['Noto Sans Regular'],
        'text-size': 11,
        'text-allow-overlap': false,
      },
      paint: {
        'text-color': COLOR,
        'text-halo-color': LABEL_HALO,
        'text-halo-width': 1.5,
      },
    })
    void load(map)
  },
  refreshMs: spcMesoscale.refreshMs,
  refresh(map) {
    void load(map)
  },
}
