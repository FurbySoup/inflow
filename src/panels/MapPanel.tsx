import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { nwsAlerts } from '../sources/nws/alerts'
import { mapLayers } from '../map/layers'
import { LayerControl } from '../map/LayerControl'
import { useSource } from '../lib/useSource'
import { statesInBbox } from '../lib/states'
import { DEFAULT_AOI, useAoi } from '../state/aoi'
import type { Alert } from '../types'

const BASEMAP = 'https://tiles.openfreemap.org/styles/dark'

const ALERT_COLORS: Record<string, string> = {
  'Tornado Warning': '#ff3b3b',
  'Severe Thunderstorm Warning': '#ff8c1a',
  'Flash Flood Warning': '#3ddc84',
}

function alertsToGeoJson(alerts: Alert[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: alerts
      .filter((a) => a.geometry)
      .map((a) => ({
        type: 'Feature',
        geometry: a.geometry!,
        properties: { event: a.event, color: ALERT_COLORS[a.event] ?? '#36c5f0' },
      })),
  }
}

export function MapPanel() {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const setAoi = useAoi((s) => s.setAoi)
  const { data: alerts } = useSource(nwsAlerts)

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
  }, [setAoi])

  useEffect(() => {
    const src = map.current?.getSource('alerts') as maplibregl.GeoJSONSource | undefined
    if (src && alerts) src.setData(alertsToGeoJson(alerts))
  }, [alerts])

  return <div ref={container} className="map" />
}
