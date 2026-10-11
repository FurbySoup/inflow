import type maplibregl from 'maplibre-gl'
import { stormReports } from '../sources/spc/reports'
import { DEFAULT_AOI } from '../state/aoi'
import type { StormReport } from '../types'
import { CASING, REPORT } from './mapStyle'
import type { MapLayer } from './layers'

const SOURCE_ID = 'storm-reports'
// Markers are drawn to a canvas at 2x and registered with pixelRatio 2, so 18 px here is 9 CSS px.
const PIXEL_RATIO = 2
const MARKER_PX = 18
const ICON = {
  tornado: `${SOURCE_ID}-tornado`,
  wind: `${SOURCE_ID}-wind`,
  hail: `${SOURCE_ID}-hail`,
} as const

const EMPTY: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

// Shape carries the meaning as well as colour: tornado ▼, wind ■, hail ●.
function drawMarker(kind: keyof typeof ICON): ImageData | null {
  const canvas = document.createElement('canvas')
  canvas.width = MARKER_PX
  canvas.height = MARKER_PX
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.beginPath()
  if (kind === 'tornado') {
    ctx.moveTo(2, 3)
    ctx.lineTo(MARKER_PX - 2, 3)
    ctx.lineTo(MARKER_PX / 2, MARKER_PX - 2)
    ctx.closePath()
  } else if (kind === 'wind') {
    ctx.rect(3, 3, MARKER_PX - 6, MARKER_PX - 6)
  } else {
    ctx.arc(MARKER_PX / 2, MARKER_PX / 2, MARKER_PX / 2 - 2, 0, Math.PI * 2)
  }
  ctx.fillStyle = REPORT[kind]
  ctx.fill()
  // 1 px casing at CSS scale.
  ctx.strokeStyle = CASING
  ctx.lineWidth = 2
  ctx.stroke()
  return ctx.getImageData(0, 0, MARKER_PX, MARKER_PX)
}

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
    for (const kind of Object.keys(ICON) as (keyof typeof ICON)[]) {
      const image = drawMarker(kind)
      if (image && !map.hasImage(ICON[kind])) map.addImage(ICON[kind], image, { pixelRatio: PIXEL_RATIO })
    }
    map.addSource(SOURCE_ID, { type: 'geojson', data: EMPTY })
    map.addLayer({
      id: SOURCE_ID,
      type: 'symbol',
      source: SOURCE_ID,
      layout: {
        'icon-image': ['match', ['get', 'kind'], 'tornado', ICON.tornado, 'wind', ICON.wind, ICON.hail],
        'icon-allow-overlap': true,
      },
    })
    void load(map)
  },
  refreshMs: stormReports.refreshMs,
  refresh(map) {
    void load(map)
  },
}
