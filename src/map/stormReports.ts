import type maplibregl from 'maplibre-gl'
import { stormReports } from '../sources/spc/reports'
import { DEFAULT_AOI } from '../state/aoi'
import type { StormReport } from '../types'
import type { MapLayer } from './layers'

const SOURCE_ID = 'storm-reports'

const EMPTY: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

function reportsToGeoJson(reports: StormReport[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: reports.map((r) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: r.location },
      properties: { kind: r.kind, time: r.time, magnitude: r.magnitude, comments: r.comments },
    })),
  }
}

async function load(map: maplibregl.Map) {
  const src = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined
  if (!src) return
  // On failure keep the last good reports on the map.
  try {
    const raw = await stormReports.fetch(DEFAULT_AOI)
    src.setData(reportsToGeoJson(stormReports.normalize(raw)))
  } catch {
    // keep previous data
  }
}

export const stormReportsLayer: MapLayer = {
  id: SOURCE_ID,
  label: 'Storm Reports (today)',
  add(map) {
    map.addSource(SOURCE_ID, { type: 'geojson', data: EMPTY })
    map.addLayer({
      id: SOURCE_ID,
      type: 'circle',
      source: SOURCE_ID,
      paint: {
        'circle-radius': 5,
        'circle-color': [
          'match',
          ['get', 'kind'],
          'tornado',
          '#ff3b3b',
          'wind',
          '#36c5f0',
          'hail',
          '#3ddc84',
          '#ffffff',
        ],
      },
    })
    void load(map)
  },
  refreshMs: stormReports.refreshMs,
  refresh(map) {
    void load(map)
  },
}
