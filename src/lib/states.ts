import type { Bbox } from '../types'

// Coarse state bounding boxes for AOI -> states lookup. Approximate by design; extend as coverage grows.
const STATE_BBOXES: Record<string, Bbox> = {
  GA: { west: -85.61, south: 30.36, east: -80.84, north: 35.0 },
  SC: { west: -83.35, south: 32.03, east: -78.54, north: 35.22 },
  NC: { west: -84.32, south: 33.84, east: -75.46, north: 36.59 },
  FL: { west: -87.63, south: 24.52, east: -80.03, north: 31.0 },
  AL: { west: -88.47, south: 30.22, east: -84.89, north: 35.01 },
  TN: { west: -90.31, south: 34.98, east: -81.65, north: 36.68 },
  OK: { west: -103.0, south: 33.62, east: -94.43, north: 37.0 },
  KS: { west: -102.05, south: 36.99, east: -94.59, north: 40.0 },
  NE: { west: -104.05, south: 40.0, east: -95.31, north: 43.0 },
  TX: { west: -106.65, south: 25.84, east: -93.51, north: 36.5 },
  // Added with the AOI presets (WP-16): Dixie Alley, the Plains and their neighbours.
  LA: { west: -94.04, south: 28.93, east: -88.82, north: 33.02 },
  MS: { west: -91.66, south: 30.17, east: -88.1, north: 35.0 },
  AR: { west: -94.62, south: 33.0, east: -89.64, north: 36.5 },
  MO: { west: -95.77, south: 35.99, east: -89.1, north: 40.61 },
  KY: { west: -89.57, south: 36.5, east: -81.96, north: 39.15 },
  VA: { west: -83.68, south: 36.54, east: -75.24, north: 39.47 },
  IA: { west: -96.64, south: 40.38, east: -90.14, north: 43.5 },
  CO: { west: -109.06, south: 36.99, east: -102.04, north: 41.0 },
  NM: { west: -109.05, south: 31.33, east: -103.0, north: 37.0 },
  SD: { west: -104.06, south: 42.48, east: -96.44, north: 45.95 },
}

const overlaps = (a: Bbox, b: Bbox) =>
  a.west < b.east && a.east > b.west && a.south < b.north && a.north > b.south

export function statesInBbox(bbox: Bbox): string[] {
  return Object.entries(STATE_BBOXES)
    .filter(([, b]) => overlaps(bbox, b))
    .map(([code]) => code)
}
