import type maplibregl from 'maplibre-gl'
import { highestLabel } from '../panels/spcRisk'
import { emptyDayLabel, outlookWindow, spcOutlook, spcOutlookDay, type OutlookDay } from '../sources/spc/outlook'
import { DEFAULT_AOI } from '../state/aoi'
import { OPACITY, SPC_CATEGORY } from './mapStyle'
import {
  getOutlookDay,
  getOutlookLoaded,
  getOutlookLoading,
  setOutlookLoaded,
  setOutlookLoading,
  subscribeOutlookDay,
} from './outlookDay'
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

// D1 is the current-day outlook: it sits under radar at the light tint. D2–D8 are about the future, so they lift above
// radar and velocity at a stronger tint; otherwise changing the day barely shows on a stormy map.
const emphasisFor = (day: OutlookDay): { fill: number; line: number } =>
  day === 1 ? { fill: OPACITY.spcFill, line: 1 } : { fill: OPACITY.dim, line: 2 }

const EMPTY: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

// The last successful load, so the 2-minute layer tick does not refetch a 30-minute Day 4–8 product.
let lastLoad: { day: OutlookDay; at: number } | null = null

function applyColor(map: maplibregl.Map, day: OutlookDay): void {
  map.setPaintProperty(SOURCE_ID, 'fill-color', colorFor(day))
  map.setPaintProperty(LINE_ID, 'line-color', colorFor(day))
}

function applyEmphasis(map: maplibregl.Map, day: OutlookDay): void {
  const { fill, line } = emphasisFor(day)
  map.setPaintProperty(SOURCE_ID, 'fill-opacity', fill)
  map.setPaintProperty(LINE_ID, 'line-width', line)
}

/**
 * Stack position of the outlook: D1 directly below the first radar layer; D2–D8 directly below the first layer above
 * the last radar or velocity layer (or at the top when none follows). Anchors are read from the live style, never named.
 */
function placeOutlook(map: maplibregl.Map, day: OutlookDay): void {
  const ids = map.getStyle().layers.map((l) => l.id).filter((id) => id !== SOURCE_ID && id !== LINE_ID)
  const isCurrentWeather = (id: string) => id.startsWith('radar') || id.startsWith('velocity')
  if (day === 1) {
    const firstRadar = ids.find((id) => id.startsWith('radar'))
    if (firstRadar === undefined) return
    map.moveLayer(SOURCE_ID, firstRadar)
    map.moveLayer(LINE_ID, firstRadar)
    return
  }
  let top = -1
  ids.forEach((id, i) => {
    if (isCurrentWeather(id)) top = i
  })
  if (top < 0) return
  const above = ids[top + 1]
  map.moveLayer(SOURCE_ID, above)
  map.moveLayer(LINE_ID, above)
}

async function load(map: maplibregl.Map, day: OutlookDay) {
  if (!map.getSource(SOURCE_ID)) return
  // A refresh of the day already on the map keeps its polygons on screen; only a change of day shows LOADING.
  if (getOutlookLoaded()?.day !== day) setOutlookLoading(day)
  const adapter = spcOutlookDay(day)
  // On failure keep the last good outlook on the map.
  try {
    const raw = await adapter.fetch(DEFAULT_AOI)
    // The selection moved on while this request was in flight: its answer is stale.
    if (getOutlookDay() !== day) {
      if (getOutlookLoading() === day) setOutlookLoading(null)
      return
    }
    const src = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined
    if (!src) return
    const features = adapter.normalize(raw)
    applyColor(map, day)
    placeOutlook(map, day)
    src.setData({ type: 'FeatureCollection', features })
    lastLoad = { day, at: Date.now() }
    setOutlookLoaded({
      day,
      window: outlookWindow(raw.features),
      highest: highestLabel(features),
      emptyLabel: emptyDayLabel(raw),
    })
  } catch {
    if (getOutlookLoading() === day) setOutlookLoading(null)
  }
}

export const spcOutlookLayer: MapLayer = {
  id: SOURCE_ID,
  label: 'SPC Outlook',
  add(map) {
    const day = getOutlookDay()
    const { fill, line } = emphasisFor(day)
    map.addSource(SOURCE_ID, { type: 'geojson', data: EMPTY })
    map.addLayer({
      id: SOURCE_ID,
      type: 'fill',
      source: SOURCE_ID,
      paint: { 'fill-color': colorFor(day), 'fill-opacity': fill },
    })
    map.addLayer({
      id: LINE_ID,
      type: 'line',
      source: SOURCE_ID,
      paint: { 'line-color': colorFor(day), 'line-width': line },
    })
    // Reload only on a day change: setOutlookLoaded also notifies these listeners.
    let requested: OutlookDay = day
    const unsubscribe = subscribeOutlookDay(() => {
      const next = getOutlookDay()
      if (next === requested) return
      requested = next
      // The press itself repaints and moves the layers; the data follows when it arrives.
      applyEmphasis(map, next)
      placeOutlook(map, next)
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
