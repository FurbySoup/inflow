import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { nwsAlerts } from '../sources/nws/alerts'
import { mapLayers } from '../map/layers'
import { CASING, FFW_CASING, FLY_EASING, FLY_MS, FOCUS, HAZARD, LABEL, LABEL_HALO, OPACITY, PDS_MARK } from '../map/mapStyle'
import { LayerControl } from '../map/LayerControl'
import { hazardCode, isPds, isWatch } from '../lib/hazards'
import { useSource } from '../lib/useSource'
import { statesInBbox } from '../lib/states'
import { DEFAULT_AOI, useAoi } from '../state/aoi'
import type { Alert } from '../types'
import { geometryBbox, remainingMs } from './alertGeometry'

const BASEMAP = 'https://tiles.openfreemap.org/styles/dark'

const EMPTY_FC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

// Warnings only: watches are drawn by the watch layers (zone outlines and SPC boxes), which have no geometry here.
// Each feature carries its hazard code, PDS flag and dim opacity so one set of expressions styles them all.
function alertsToGeoJson(alerts: Alert[], focusId: string | null): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: alerts
      .filter((a) => a.geometry && !isWatch(a.event))
      .map((a) => ({
        type: 'Feature',
        geometry: a.geometry!,
        properties: {
          id: a.id,
          hazard: hazardCode(a.event),
          pds: isPds(a),
          opacity: focusId && a.id !== focusId ? OPACITY.dim : 1,
        },
      })),
  }
}

// Literal paint values (MapLibre can't read CSS vars); see src/map/mapStyle.ts for the token parity.
const WARNING_COLOR: maplibregl.ExpressionSpecification = [
  'match',
  ['get', 'hazard'],
  'TOR',
  HAZARD.TOR,
  'SVR',
  HAZARD.SVR,
  'FFW',
  HAZARD.FFW,
  HAZARD.OTHER,
]
const CASING_COLOR: maplibregl.ExpressionSpecification = ['match', ['get', 'hazard'], 'FFW', FFW_CASING, CASING]
const IS_PDS: maplibregl.ExpressionSpecification = ['==', ['get', 'pds'], true]
const DIM: maplibregl.ExpressionSpecification = ['get', 'opacity']

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function MapPanel() {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const alertsRef = useRef<Alert[]>([])
  const [ready, setReady] = useState(false)
  const setAoi = useAoi((s) => s.setAoi)
  const focus = useAoi((s) => s.focus)
  const setFocus = useAoi((s) => s.setFocus)
  const aoiRequest = useAoi((s) => s.aoiRequest)
  const clearAoiRequest = useAoi((s) => s.clearAoiRequest)
  const { data: alerts } = useSource(nwsAlerts)
  const focusId = focus?.id ?? null
  const focusAlert = focus ? (alerts?.find((a) => a.id === focus.id) ?? null) : null
  const focusGeometry = focusAlert?.geometry ?? null
  const focusHazard = focusAlert ? hazardCode(focusAlert.event) : null

  useEffect(() => {
    alertsRef.current = alerts ?? []
  }, [alerts])

  // Drop focus when its alert has gone (cancelled or expired). Skip while alerts are still loading.
  useEffect(() => {
    if (!focus || !alerts) return
    const live = alerts.find((a) => a.id === focus.id)
    const left = live ? remainingMs(live.expires, Date.now()) : null
    if (!live || (left !== null && left <= 0)) setFocus(null)
  }, [focus, alerts, setFocus])

  useEffect(() => {
    if (!container.current) return
    const m = new maplibregl.Map({
      container: container.current,
      style: BASEMAP,
      bounds: [DEFAULT_AOI.west, DEFAULT_AOI.south, DEFAULT_AOI.east, DEFAULT_AOI.north],
    })
    map.current = m
    // Dev-only handle for inspecting the live map from the console / browser tooling.
    if (import.meta.env.DEV) Object.assign(window, { __map: m })
    const timers: ReturnType<typeof setInterval>[] = []

    m.on('load', () => {
      // Basemap labels: INFLOW label paint, moved above the overlays below.
      const basemapLabels = m
        .getStyle()
        .layers.filter((l) => l.type === 'symbol')
        .map((l) => l.id)
      for (const id of basemapLabels) {
        m.setPaintProperty(id, 'text-color', LABEL)
        m.setPaintProperty(id, 'text-halo-color', LABEL_HALO)
        m.setPaintProperty(id, 'text-halo-width', 2)
      }
      for (const layer of mapLayers) {
        layer.add(m)
        if (layer.refresh && layer.refreshMs) {
          timers.push(setInterval(() => layer.refresh!(m), layer.refreshMs))
        }
      }
      // Alerts stay on top of all registered overlays. Draw order: focus fill and halo, casing, PDS mark, stroke.
      m.addSource('alerts', { type: 'geojson', data: alertsToGeoJson([], null) })
      // No fill (INFLOW §7); transparent so it stays the click target for the alert.
      m.addLayer({
        id: 'alerts-fill',
        type: 'fill',
        source: 'alerts',
        paint: { 'fill-color': WARNING_COLOR, 'fill-opacity': 0 },
      })
      m.addSource('alerts-focus', { type: 'geojson', data: EMPTY_FC })
      m.addLayer({
        id: 'alerts-focus-fill',
        type: 'fill',
        source: 'alerts-focus',
        paint: { 'fill-color': WARNING_COLOR, 'fill-opacity': OPACITY.focusFill },
      })
      m.addLayer({
        id: 'alerts-focus-halo',
        type: 'line',
        source: 'alerts-focus',
        paint: { 'line-color': FOCUS, 'line-width': 9, 'line-opacity': OPACITY.focusHalo },
      })
      m.addLayer({
        id: 'alerts-casing',
        type: 'line',
        source: 'alerts',
        paint: {
          'line-color': CASING_COLOR,
          'line-width': ['case', IS_PDS, 7, 4.5],
          'line-opacity': DIM,
        },
      })
      m.addLayer({
        id: 'alerts-pds',
        type: 'line',
        source: 'alerts',
        filter: IS_PDS,
        paint: { 'line-color': PDS_MARK, 'line-width': 4.5, 'line-opacity': DIM },
      })
      m.addLayer({
        id: 'alerts-line',
        type: 'line',
        source: 'alerts',
        paint: {
          'line-color': WARNING_COLOR,
          'line-width': ['case', IS_PDS, 2.5, 2],
          'line-opacity': DIM,
        },
      })
      // Labels sit above radar and warnings (INFLOW §7): move every symbol layer to the top, keeping their order.
      const symbolLayers = m
        .getStyle()
        .layers.filter((l) => l.type === 'symbol')
        .map((l) => l.id)
      for (const id of symbolLayers) m.moveLayer(id)
      m.on('click', 'alerts-fill', (e) => {
        const id = e.features?.[0]?.properties.id
        // Use the full alert geometry, not the tile-clipped rendered feature.
        const alert = typeof id === 'string' ? alertsRef.current.find((a) => a.id === id) : undefined
        const bbox = alert ? geometryBbox(alert.geometry) : null
        if (alert && bbox) setFocus({ id: alert.id, bbox })
      })
      m.on('mouseenter', 'alerts-fill', () => {
        m.getCanvas().style.cursor = 'pointer'
      })
      m.on('mouseleave', 'alerts-fill', () => {
        m.getCanvas().style.cursor = ''
      })
      setReady(true)
      m.addControl(new LayerControl(mapLayers), 'top-left')
    })

    m.on('moveend', () => {
      const b = m.getBounds()
      const bbox = { west: b.getWest(), south: b.getSouth(), east: b.getEast(), north: b.getNorth() }
      setAoi(bbox, statesInBbox(bbox))
    })

    // MapLibre only tracks window resizes; splitters resize the container directly.
    const resizeObserver = new ResizeObserver(() => m.resize())
    resizeObserver.observe(container.current)

    return () => {
      resizeObserver.disconnect()
      timers.forEach(clearInterval)
      m.remove()
    }
  }, [setAoi, setFocus])

  useEffect(() => {
    const src = map.current?.getSource('alerts') as maplibregl.GeoJSONSource | undefined
    if (src && alerts) src.setData(alertsToGeoJson(alerts, focusId))
  }, [alerts, ready, focusId])

  useEffect(() => {
    const m = map.current
    if (!m || !ready || !focus) return
    const { west, south, east, north } = focus.bbox
    // Fly to the bbox plus 15% (7.5% each side); a jump-cut under reduced motion.
    const padLng = (east - west) * 0.075
    const padLat = (north - south) * 0.075
    m.fitBounds(
      [
        [west - padLng, south - padLat],
        [east + padLng, north + padLat],
      ],
      { maxZoom: 11, duration: prefersReducedMotion() ? 0 : FLY_MS, easing: FLY_EASING },
    )
  }, [focus, ready])

  // AOI preset requests: fly to the region; the moveend handler then updates the AOI as usual.
  useEffect(() => {
    const m = map.current
    if (!m || !ready || !aoiRequest) return
    const { west, south, east, north } = aoiRequest.bbox
    m.fitBounds(
      [
        [west, south],
        [east, north],
      ],
      { padding: 20 },
    )
    clearAoiRequest()
  }, [aoiRequest, ready, clearAoiRequest])

  useEffect(() => {
    const src = map.current?.getSource('alerts-focus') as maplibregl.GeoJSONSource | undefined
    if (!src) return
    src.setData(
      focusGeometry && focusHazard
        ? { type: 'Feature', properties: { hazard: focusHazard }, geometry: focusGeometry }
        : EMPTY_FC,
    )
  }, [focusGeometry, focusHazard, ready])

  return <div ref={container} className="map" />
}
