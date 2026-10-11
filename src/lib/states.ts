import type { Bbox } from '../types'
import { bboxIntersectsRing, bboxesOverlap, pointInRing, ringBbox } from './geo'
import shapes from './stateShapes.json'

// Simplified outer rings (about 5 km tolerance) for the 50 states, DC and PR, generated offline from us-atlas
// (Census boundaries) by scripts/gen-state-shapes.cjs. ADR-0016 replaces the old 20-state bbox table.
const STATE_SHAPES = Object.entries(shapes as Record<string, number[][][]>).map(([code, rings]) => ({
  code,
  rings: rings.map((ring) => ({ ring, bbox: ringBbox(ring) })),
}))

/** Every code statesInBbox can return: the 50 states, DC and PR. */
export const STATE_CODES: readonly string[] = STATE_SHAPES.map((s) => s.code)

/** States (USPS codes, alphabetical) whose land shares area with the bbox. */
export function statesInBbox(bbox: Bbox): string[] {
  return STATE_SHAPES.filter((s) =>
    s.rings.some((r) => bboxesOverlap(bbox, r.bbox) && bboxIntersectsRing(bbox, r.ring)),
  ).map((s) => s.code)
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
