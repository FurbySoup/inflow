import type maplibregl from 'maplibre-gl'
import { nwsAlerts } from '../sources/nws/alerts'
import { allCountyZoneUrls, buildOutlineFeatures, zoneBasedAlerts } from '../sources/nwszones/outlines'
import { getZoneShapes } from '../sources/nwszones/shapes'
import { useAoi } from '../state/aoi'
import type { MapLayer } from './layers'

const SOURCE_ID = 'watch-outlines'
const REFRESH_MS = 120_000
// Literal paint values matching the --extreme / --severe / --moderate tokens (MapLibre can't read CSS vars).
const SEVERITY_COLOR: maplibregl.ExpressionSpecification = [
  'match',
  ['get', 'severity'],
  'Extreme',
  '#ff3b3b',
  'Severe',
  '#ff8c1a',
  'Moderate',
  '#ffd23f',
  '#ffffff',
]

const EMPTY: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

async function load(map: maplibregl.Map) {
  const src = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined
  if (!src) return
  // On failure keep the last good outlines on the map.
  try {
    const { bbox, states } = useAoi.getState()
    const alerts = zoneBasedAlerts(nwsAlerts.normalize(await nwsAlerts.fetch(bbox)), states)
    const shapes = await getZoneShapes(allCountyZoneUrls(alerts))
    src.setData({ type: 'FeatureCollection', features: buildOutlineFeatures(alerts, shapes) })
  } catch {
    // keep previous data
  }
}

export const watchOutlinesLayer: MapLayer = {
  id: SOURCE_ID,
  label: 'Watch county outlines',
  add(map) {
    map.addSource(SOURCE_ID, { type: 'geojson', data: EMPTY })
    map.addLayer({
      id: `${SOURCE_ID}-fill`,
      type: 'fill',
      source: SOURCE_ID,
      paint: { 'fill-color': SEVERITY_COLOR, 'fill-opacity': 0.12 },
    })
    // Dash length is in line-width units: 3 × 2 px dashes read at phone size and differ from WP-13's solid watch boxes.
    map.addLayer({
      id: `${SOURCE_ID}-line`,
      type: 'line',
      source: SOURCE_ID,
      paint: { 'line-color': SEVERITY_COLOR, 'line-width': 2, 'line-dasharray': [3, 2] },
    })
    void load(map)
  },
  refreshMs: REFRESH_MS,
  refresh(map) {
    void load(map)
  },
}
