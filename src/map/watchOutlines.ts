import type maplibregl from 'maplibre-gl'
import { hazardCode } from '../lib/hazards'
import { nwsAlerts } from '../sources/nws/alerts'
import { allOutlineZoneUrls, buildOutlineFeatures, zoneBasedAlerts } from '../sources/nwszones/outlines'
import { getZoneShapes } from '../sources/nwszones/shapes'
import { useAoi } from '../state/aoi'
import { CASING, HAZARD, watchDash } from './mapStyle'
import type { MapLayer } from './layers'

const SOURCE_ID = 'watch-outlines'
const REFRESH_MS = 120_000
const WATCH_WIDTH = 2
const CASING_WIDTH = 4.5

const EMPTY: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

// Literal paint values by hazard (MapLibre can't read CSS vars). Watches map to TOA yellow and SVA pink.
const HAZARD_COLOR: maplibregl.ExpressionSpecification = [
  'match',
  ['get', 'hazard'],
  'TOR',
  HAZARD.TOR,
  'SVR',
  HAZARD.SVR,
  'FFW',
  HAZARD.FFW,
  'TOA',
  HAZARD.TOA,
  'SVA',
  HAZARD.SVA,
  HAZARD.OTHER,
]

async function load(map: maplibregl.Map) {
  const src = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined
  if (!src) return
  // On failure keep the last good outlines on the map.
  try {
    const { bbox, states } = useAoi.getState()
    const alerts = zoneBasedAlerts(nwsAlerts.normalize(await nwsAlerts.fetch(bbox)), states)
    const shapes = await getZoneShapes(allOutlineZoneUrls(alerts))
    const features = buildOutlineFeatures(alerts, shapes).map((f) => {
      const event = typeof f.properties?.event === 'string' ? f.properties.event : ''
      return { ...f, properties: { ...f.properties, hazard: hazardCode(event) } }
    })
    src.setData({ type: 'FeatureCollection', features })
  } catch {
    // keep previous data
  }
}

export const watchOutlinesLayer: MapLayer = {
  id: SOURCE_ID,
  label: 'Watch zone outlines',
  add(map) {
    map.addSource(SOURCE_ID, { type: 'geojson', data: EMPTY })
    map.addLayer({
      id: `${SOURCE_ID}-fill`,
      type: 'fill',
      source: SOURCE_ID,
      paint: { 'fill-color': HAZARD_COLOR, 'fill-opacity': 0.12 },
    })
    // Watch styling: 2 px dashed hazard stroke over a dashed casing (INFLOW §7).
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
      paint: { 'line-color': HAZARD_COLOR, 'line-width': WATCH_WIDTH, 'line-dasharray': watchDash(WATCH_WIDTH) },
    })
    void load(map)
  },
  refreshMs: REFRESH_MS,
  refresh(map) {
    void load(map)
  },
}
