import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { nwsAlerts } from '../sources/nws/alerts'
import { mapLayers } from '../map/layers'
import { LayerControl } from '../map/LayerControl'
import { useSource } from '../lib/useSource'
import { statesInBbox } from '../lib/states'
import { DEFAULT_AOI, useAoi } from '../state/aoi'
import type { Alert } from '../types'
import { geometryBbox, remainingMs } from './alertGeometry'

const BASEMAP = 'https://tiles.openfreemap.org/styles/dark'

const ALERT_COLORS: Record<string, string> = {
  'Tornado Warning': '#ff3b3b',
  'Severe Thunderstorm Warning': '#ff8c1a',
  'Flash Flood Warning': '#3ddc84',
}

const EMPTY_FC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

function alertsToGeoJson(alerts: Alert[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: alerts
      .filter((a) => a.geometry)
      .map((a) => ({
        type: 'Feature',
        geometry: a.geometry!,
        properties: { id: a.id, event: a.event, color: ALERT_COLORS[a.event] ?? '#8DC5EE' },
      })),
  }
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
  const focusGeometry = (focus && alerts?.find((a) => a.id === focus.id)?.geometry) || null

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
      for (const layer of mapLayers) {
        layer.add(m)
        if (layer.refresh && layer.refreshMs) {
          timers.push(setInterval(() => layer.refresh!(m), layer.refreshMs))
        }
      }
      // Alerts stay on top of all registered overlays.
      m.addSource('alerts', { type: 'geojson', data: alertsToGeoJson([]) })
      m.addLayer({
        id: 'alerts-fill',
        type: 'fill',
        source: 'alerts',
        paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.15 },
      })
      m.addLayer({
        id: 'alerts-line',
        type: 'line',
        source: 'alerts',
        paint: { 'line-color': ['get', 'color'], 'line-width': 2 },
      })
      m.addSource('alerts-focus', { type: 'geojson', data: EMPTY_FC })
      m.addLayer({
        id: 'alerts-focus',
        type: 'line',
        source: 'alerts-focus',
        // INFLOW --map-focus (ice-200); MapLibre paint needs a literal.
        paint: { 'line-color': '#CFE6F8', 'line-width': 4 },
      })
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
    if (src && alerts) src.setData(alertsToGeoJson(alerts))
  }, [alerts, ready])

  useEffect(() => {
    const m = map.current
    if (!m || !ready || !focus) return
    const { west, south, east, north } = focus.bbox
    m.fitBounds(
      [
        [west, south],
        [east, north],
      ],
      { padding: 80, maxZoom: 11 },
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
      focusGeometry ? { type: 'Feature', properties: {}, geometry: focusGeometry } : EMPTY_FC,
    )
  }, [focusGeometry, ready])

  return <div ref={container} className="map" />
}
