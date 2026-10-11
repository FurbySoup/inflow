import type { Bbox } from '../types'

type Ring = number[][]

/** Bounding boxes overlap (touching edges count as no overlap). */
export function bboxesOverlap(a: Bbox, b: Bbox): boolean {
  return a.west < b.east && a.east > b.west && a.south < b.north && a.north > b.south
}

/** Bounding box of one ring of [lng, lat] positions. */
export function ringBbox(ring: Ring): Bbox {
  const b: Bbox = { west: Infinity, south: Infinity, east: -Infinity, north: -Infinity }
  for (const [lng, lat] of ring) {
    if (lng < b.west) b.west = lng
    if (lng > b.east) b.east = lng
    if (lat < b.south) b.south = lat
    if (lat > b.north) b.north = lat
  }
  return b
}

/** Even-odd ray cast. Points exactly on an edge may go either way. */
export function pointInRing(lng: number, lat: number, ring: Ring): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

function cross(ax: number, ay: number, bx: number, by: number, cx: number, cy: number) {
  return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax)
}

function segmentsCross(p1: number[], p2: number[], q1: number[], q2: number[]): boolean {
  const d1 = cross(q1[0], q1[1], q2[0], q2[1], p1[0], p1[1])
  const d2 = cross(q1[0], q1[1], q2[0], q2[1], p2[0], p2[1])
  const d3 = cross(p1[0], p1[1], p2[0], p2[1], q1[0], q1[1])
  const d4 = cross(p1[0], p1[1], p2[0], p2[1], q2[0], q2[1])
  return d1 * d2 < 0 && d3 * d4 < 0
}

/**
 * True when a ring (the outer ring of a polygon; holes are ignored) and a bbox share any area:
 * a vertex inside the bbox, the bbox centre inside the ring, or an edge crossing a bbox side.
 */
export function bboxIntersectsRing(bbox: Bbox, ring: Ring): boolean {
  if (ring.length < 3 || !bboxesOverlap(bbox, ringBbox(ring))) return false
  for (const [lng, lat] of ring) {
    if (lng > bbox.west && lng < bbox.east && lat > bbox.south && lat < bbox.north) return true
  }
  if (pointInRing((bbox.west + bbox.east) / 2, (bbox.south + bbox.north) / 2, ring)) return true
  const corners = [
    [bbox.west, bbox.south],
    [bbox.east, bbox.south],
    [bbox.east, bbox.north],
    [bbox.west, bbox.north],
  ]
  for (let i = 0; i < ring.length - 1; i++) {
    for (let k = 0; k < 4; k++) {
      if (segmentsCross(ring[i], ring[i + 1], corners[k], corners[(k + 1) % 4])) return true
    }
  }
  return false
}

/** True when a Polygon or MultiPolygon shares area with the bbox. Any other geometry (or null) gives false. */
export function bboxIntersectsGeometry(bbox: Bbox, geometry: GeoJSON.Geometry | null): boolean {
  if (!geometry) return false
  if (geometry.type === 'Polygon') return bboxIntersectsRing(bbox, geometry.coordinates[0] ?? [])
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.some((poly) => bboxIntersectsRing(bbox, poly[0] ?? []))
  }
  return false
}
