import { describe, expect, it } from 'vitest'
import { bboxIntersectsGeometry, bboxIntersectsRing, pointInRing } from './geo'

const square = [
  [0, 0],
  [10, 0],
  [10, 10],
  [0, 10],
  [0, 0],
]

describe('geo', () => {
  it('pointInRing', () => {
    expect(pointInRing(5, 5, square)).toBe(true)
    expect(pointInRing(15, 5, square)).toBe(false)
  })

  it('bbox vs ring: vertex inside, bbox inside ring, edge crossing, apart', () => {
    expect(bboxIntersectsRing({ west: 8, south: 8, east: 12, north: 12 }, square)).toBe(true)
    expect(bboxIntersectsRing({ west: 4, south: 4, east: 6, north: 6 }, square)).toBe(true)
    // A thin bbox crossing the square with no vertex inside it and its centre outside the ring.
    expect(bboxIntersectsRing({ west: -5, south: 4, east: 11, north: 6 }, square)).toBe(true)
    expect(bboxIntersectsRing({ west: 11, south: 0, east: 12, north: 10 }, square)).toBe(false)
  })

  it('a triangle whose bbox overlaps but whose area does not', () => {
    const tri = [
      [0, 0],
      [10, 0],
      [0, 10],
      [0, 0],
    ]
    expect(bboxIntersectsRing({ west: 8, south: 8, east: 10, north: 10 }, tri)).toBe(false)
  })

  it('geometry: Polygon, MultiPolygon, null', () => {
    const bbox = { west: 4, south: 4, east: 6, north: 6 }
    expect(bboxIntersectsGeometry(bbox, { type: 'Polygon', coordinates: [square] })).toBe(true)
    expect(
      bboxIntersectsGeometry(bbox, {
        type: 'MultiPolygon',
        coordinates: [
          [
            [
              [20, 20],
              [21, 20],
              [21, 21],
              [20, 20],
            ],
          ],
          [square],
        ],
      }),
    ).toBe(true)
    expect(bboxIntersectsGeometry(bbox, null)).toBe(false)
    expect(bboxIntersectsGeometry(bbox, { type: 'Point', coordinates: [5, 5] })).toBe(false)
  })
})
