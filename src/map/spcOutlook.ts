import type maplibregl from 'maplibre-gl'
import { outlookWindow, spcOutlook, spcOutlookDay, type OutlookDay } from '../sources/spc/outlook'
import { DEFAULT_AOI } from '../state/aoi'
import { OPACITY, SPC_CATEGORY } from './mapStyle'
import { getOutlookDay, setOutlookLoaded, subscribeOutlookDay } from './outlookDay'
import type { MapLayer } from './layers'

const SOURCE_ID = 'spc-outlook'
const LINE_ID = `${SOURCE_ID}-line`

// Categorical colour by LABEL from the SPC palette (Days 1–3). Upstream `fill` only as a fallback for unknown labels.
const CATEGORY_COLOR: maplibregl.ExpressionSpecification = [
  'match',
  ['get', 'LABEL'],
  'TSTM',
  SPC_CATEGORY.TSTM,
  'MRGL',
  SPC_CATEGORY.MRGL,
  'SLGT',
  SPC_CATEGORY.SLGT,
  'ENH',
  SPC_CATEGORY.ENH,
  'MDT',
  SPC_CATEGORY.MDT,
  'HIGH',
  SPC_CATEGORY.HIGH,
  ['get', 'fill'],
]

// Days 4–8 colour by probability (DN, percent): SPC's own convention, 15% = SLGT and 30% = ENH.
const PROBABILITY_COLOR: maplibregl.ExpressionSpecification = [
  'match',
  ['get', 'DN'],
  15,
  SPC_CATEGORY.SLGT,
  30,
  SPC_CATEGORY.ENH,
  ['get', 'fill'],
]

const colorFor = (day: OutlookDay): maplibregl.ExpressionSpecification => (day <= 3 ? CATEGORY_COLOR : PROBABILITY_COLOR)

const EMPTY: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

// The last successful load, so the 2-minute layer tick does not refetch a 30-minute Day 4–8 product.
let lastLoad: { day: OutlookDay; at: number } | null = null

function applyColor(map: maplibregl.Map, day: OutlookDay): void {
  map.setPaintProperty(SOURCE_ID, 'fill-color', colorFor(day))
  map.setPaintProperty(LINE_ID, 'line-color', colorFor(day))
}

async function load(map: maplibregl.Map, day: OutlookDay) {
  if (!map.getSource(SOURCE_ID)) return
  const adapter = spcOutlookDay(day)
  // On failure keep the last good outlook on the map.
  try {
    const raw = await adapter.fetch(DEFAULT_AOI)
    // The selection moved on while this request was in flight: its answer is stale.
    if (getOutlookDay() !== day) return
    const src = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined
    if (!src) return
    const features = adapter.normalize(raw)
    applyColor(map, day)
    src.setData({ type: 'FeatureCollection', features })
    lastLoad = { day, at: Date.now() }
    setOutlookLoaded({ day, window: outlookWindow(features) })
  } catch {
    // keep previous data
  }
}

export const spcOutlookLayer: MapLayer = {
  id: SOURCE_ID,
  label: 'SPC Outlook',
  add(map) {
    const day = getOutlookDay()
    map.addSource(SOURCE_ID, { type: 'geojson', data: EMPTY })
    map.addLayer({
      id: SOURCE_ID,
      type: 'fill',
      source: SOURCE_ID,
      paint: { 'fill-color': colorFor(day), 'fill-opacity': OPACITY.spcFill },
    })
    map.addLayer({
      id: LINE_ID,
      type: 'line',
      source: SOURCE_ID,
      paint: { 'line-color': colorFor(day), 'line-width': 1 },
    })
    // Reload only on a day change: setOutlookLoaded also notifies these listeners.
    let requested: OutlookDay = day
    const unsubscribe = subscribeOutlookDay(() => {
      const next = getOutlookDay()
      if (next === requested) return
      requested = next
      void load(map, next)
    })
    map.on('remove', unsubscribe)
    void load(map, day)
  },
  refreshMs: spcOutlook.refreshMs,
  refresh(map) {
    const day = getOutlookDay()
    if (lastLoad?.day === day && Date.now() - lastLoad.at < spcOutlookDay(day).refreshMs) return
    void load(map, day)
  },
}
