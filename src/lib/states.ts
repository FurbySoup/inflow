import type { Bbox } from '../types'
import { bboxIntersectsRing, bboxesOverlap, pointInRing, ringBbox } from './geo'
import shapes from './stateShapes.json'

// Simplified outer rings (about 5 km tolerance) for the 50 states, DC and PR, generated offline from us-atlas
// (Census boundaries) by scripts/gen-state-shapes.cjs. ADR-0016 replaces the old 20-state bbox table.
const STATE_SHAPES = Object.entries(shapes as Record<string, number[][][]>).map(([code, rings]) => {
  const parts = rings.map((ring) => ({ ring, bbox: ringBbox(ring) }))
  // The largest ring's bbox centre stands in for the state's position (Alaska's Aleutians, the Keys and the like
  // would drag a whole-state centre off the mainland).
  const main = parts.reduce((a, b) =>
    (b.bbox.east - b.bbox.west) * (b.bbox.north - b.bbox.south) >
    (a.bbox.east - a.bbox.west) * (a.bbox.north - a.bbox.south)
      ? b
      : a,
  )
  return {
    code,
    rings: parts,
    centre: [(main.bbox.west + main.bbox.east) / 2, (main.bbox.south + main.bbox.north) / 2] as const,
  }
})

/** Every code statesInBbox can return: the 50 states, DC and PR. */
export const STATE_CODES: readonly string[] = STATE_SHAPES.map((s) => s.code)

/**
 * States (USPS codes) whose land shares area with the bbox, nearest to the AOI centre first, so a capped list
 * (the top bar shows 6) leads with the states actually in view rather than the alphabet.
 */
export function statesInBbox(bbox: Bbox): string[] {
  const cx = (bbox.west + bbox.east) / 2
  const cy = (bbox.south + bbox.north) / 2
  const dist = (c: readonly [number, number]) => (c[0] - cx) ** 2 + (c[1] - cy) ** 2
  return STATE_SHAPES.filter((s) =>
    s.rings.some((r) => bboxesOverlap(bbox, r.bbox) && bboxIntersectsRing(bbox, r.ring)),
  )
    .sort((a, b) => dist(a.centre) - dist(b.centre))
    .map((s) => s.code)
}

/** The state a point falls in (e.g. a camera on a multi-state 511 site), or null offshore. Shapes are simplified, so a point within ~5 km of a border can land in the neighbour or nowhere. */
export function stateAt(lng: number, lat: number): string | null {
  const hit = STATE_SHAPES.find((s) =>
    s.rings.some(
      (r) =>
        lng >= r.bbox.west &&
        lng <= r.bbox.east &&
        lat >= r.bbox.south &&
        lat <= r.bbox.north &&
        pointInRing(lng, lat, r.ring),
    ),
  )
  return hit?.code ?? null
}
