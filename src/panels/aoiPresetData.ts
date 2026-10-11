import { DEFAULT_AOI } from '../state/aoi'
import type { Bbox } from '../types'

export type AoiPresetId = 'plains' | 'dixie' | 'southeast'

export interface AoiPreset {
  id: AoiPresetId
  label: string
  title: string
  bbox: Bbox
}

export const AOI_PRESETS: readonly AoiPreset[] = [
  {
    id: 'plains',
    label: 'PLAINS',
    title: 'Plains: TX panhandle to Nebraska',
    bbox: { west: -104, south: 31, east: -94, north: 43 },
  },
  {
    id: 'dixie',
    label: 'DIXIE',
    title: 'Dixie Alley: LA, MS, AL, TN',
    bbox: { west: -94, south: 29.5, east: -84.5, north: 37 },
  },
  {
    id: 'southeast',
    label: 'SE',
    title: 'Southeast: GA and SC (default AOI)',
    bbox: DEFAULT_AOI,
  },
]

// The view centre may drift this far (as a fraction of the preset's span) before the preset un-presses.
const CENTRE_TOLERANCE = 0.05
// Slack in degrees on the edge-coverage check, for float noise in MapLibre's bounds.
const EDGE_SLACK = 0.05
// A view larger than this multiple of the preset's area means the user has zoomed out past it.
const MAX_AREA_RATIO = 3

// Returns the preset whose region the view still shows, or null after a manual pan or zoom.
// fitBounds adapts a preset to any aspect ratio by expanding one axis symmetrically, so the test
// keeps the centre and asks for full edge coverage rather than comparing exact extents.
export function matchPreset(bbox: Bbox): AoiPresetId | null {
  for (const preset of AOI_PRESETS) {
    if (isPresetView(preset.bbox, bbox)) return preset.id
  }
  return null
}

function isPresetView(preset: Bbox, view: Bbox): boolean {
  const presetWidth = preset.east - preset.west
  const presetHeight = preset.north - preset.south
  const covers =
    view.west <= preset.west + EDGE_SLACK &&
    view.east >= preset.east - EDGE_SLACK &&
    view.south <= preset.south + EDGE_SLACK &&
    view.north >= preset.north - EDGE_SLACK
  if (!covers) return false

  const viewArea = (view.east - view.west) * (view.north - view.south)
  if (viewArea > presetWidth * presetHeight * MAX_AREA_RATIO) return false

  const dx = Math.abs((view.west + view.east) / 2 - (preset.west + preset.east) / 2)
  const dy = Math.abs((view.south + view.north) / 2 - (preset.south + preset.north) / 2)
  return dx <= presetWidth * CENTRE_TOLERANCE && dy <= presetHeight * CENTRE_TOLERANCE
}
