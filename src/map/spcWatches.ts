import type maplibregl from 'maplibre-gl'
import { spcWatchBoxes } from '../sources/iemspc/watches'
import { DEFAULT_AOI } from '../state/aoi'
import { CASING, HAZARD, LABEL_HALO, watchDash } from './mapStyle'
import type { MapLayer } from './layers'

const SOURCE_ID = 'spc-watch'
const WATCH_WIDTH = 2
const CASING_WIDTH = 4.5

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

// spc_watch_outline has no PDS flag, so PDS watches are not drawn distinctly; the spcwatch.py is_pds join was deliberately not added (unverified).
// Watch boxes use the TOA (tornado) and SVA (severe) hazard colours.
const KIND_COLOR: maplibregl.ExpressionSpecification = [
  'match',
  ['get', 'kind'],
  'TOR',
  HAZARD.TOA,
  HAZARD.SVA,
]

export const spcWatchesLayer: MapLayer = {
  id: SOURCE_ID,
  label: 'SPC Watch Boxes',
  add(map) {
    map.addSource(SOURCE_ID, { type: 'geojson', data: EMPTY })
    map.addLayer({
      id: `${SOURCE_ID}-casing`,
      type: 'line',
      source: SOURCE_ID,
      paint: { 'line-color': CASING, 'line-width': CASING_WIDTH, 'line-dasharray': watchDash(CASING_WIDTH) },
    })
    map.addLayer({
      id: `${SOURCE_ID}-line`,
      type: 'line',
      source: SOURCE_ID,
      paint: { 'line-color': KIND_COLOR, 'line-width': WATCH_WIDTH, 'line-dasharray': watchDash(WATCH_WIDTH) },
    })
    map.addLayer({
      id: `${SOURCE_ID}-label`,
      type: 'symbol',
      source: SOURCE_ID,
      layout: {
        'text-field': ['get', 'label'],
        'text-font': ['Noto Sans Regular'],
        'text-size': 12,
        'text-allow-overlap': false,
      },
      paint: {
        'text-color': KIND_COLOR,
        'text-halo-color': LABEL_HALO,
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
