import type maplibregl from 'maplibre-gl'
import { spcWatchBoxes } from '../sources/iemspc/watches'
import { DEFAULT_AOI } from '../state/aoi'
import type { MapLayer } from './layers'

const SOURCE_ID = 'spc-watch'
const TOR_COLOR = '#ff3b3b'
const SVR_COLOR = '#ffd23f'

const EMPTY: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

async function load(map: maplibregl.Map) {
  const src = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined
  if (!src) return
  // On failure keep the last good watch boxes on the map.
  try {
    const raw = await spcWatchBoxes.fetch(DEFAULT_AOI)
    src.setData({ type: 'FeatureCollection', features: spcWatchBoxes.normalize(raw) })
  } catch {
    // keep previous data
  }
}

const KIND_COLOR: maplibregl.ExpressionSpecification = [
  'match',
  ['get', 'kind'],
  'TOR',
  TOR_COLOR,
  SVR_COLOR,
]

export const spcWatchesLayer: MapLayer = {
  id: SOURCE_ID,
  label: 'SPC Watch Boxes',
  add(map) {
    map.addSource(SOURCE_ID, { type: 'geojson', data: EMPTY })
    map.addLayer({
      id: `${SOURCE_ID}-line`,
      type: 'line',
      source: SOURCE_ID,
      paint: { 'line-color': KIND_COLOR, 'line-width': 2 },
    })
    map.addLayer({
      id: `${SOURCE_ID}-label`,
      type: 'symbol',
      source: SOURCE_ID,
      layout: {
        'text-field': ['get', 'label'],
        'text-font': ['Noto Sans Bold'],
        'text-size': 12,
        'text-allow-overlap': false,
      },
      paint: {
        'text-color': KIND_COLOR,
        'text-halo-color': '#0b0f14',
        'text-halo-width': 1.5,
      },
    })
    void load(map)
  },
  refreshMs: spcWatchBoxes.refreshMs,
  refresh(map) {
    void load(map)
  },
}
