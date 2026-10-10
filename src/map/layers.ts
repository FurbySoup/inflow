import type maplibregl from 'maplibre-gl'
import { radarLayer } from './radar'
import { spcOutlookLayer } from './spcOutlook'
import { stormReportsLayer } from './stormReports'

/**
 * A map overlay. Each work package that draws on the map adds one MapLayer module and one
 * line in `mapLayers` below — never edit MapPanel to add a layer.
 */
export interface MapLayer {
  id: string
  label: string
  /** Add sources/layers. Called once after the style loads. */
  add(map: maplibregl.Map): void
  /** Optional periodic refresh (e.g. tile cache busting). */
  refreshMs?: number
  refresh?(map: maplibregl.Map): void
}

// Order = draw order (first is bottom-most).
export const mapLayers: MapLayer[] = [spcOutlookLayer, radarLayer, stormReportsLayer]
