import type { Bbox } from '../../types'

// TxDOT ITS district codes accepted by GetCctvStatusListByDistrict (checked 2026-10-10: all 25 return cameras).
export const TXDOT_DISTRICTS = [
  'ABL', 'AMA', 'ATL', 'AUS', 'BMT', 'BRY', 'BWD', 'CHS', 'CRP', 'DAL', 'ELP', 'FTW', 'HOU',
  'LBB', 'LRD', 'LFK', 'ODA', 'PAR', 'PHR', 'SAT', 'SJT', 'TYL', 'WAC', 'WFS', 'YKM',
] as const

export type TxdotDistrict = (typeof TXDOT_DISTRICTS)[number]

// Rough bounds per district, derived from the extents of each district's camera locations
// (2026-10-10) and padded outward. These are not official district boundaries.
export const DISTRICT_BBOX: Record<TxdotDistrict, Bbox> = {
  ABL: { west: -101.8, south: 32.0, east: -99.0, north: 32.9 },
  AMA: { west: -102.9, south: 34.9, east: -100.4, north: 36.1 },
  ATL: { west: -95.3, south: 32.0, east: -93.9, north: 33.6 },
  AUS: { west: -98.2, south: 29.5, east: -97.4, north: 31.0 },
  BMT: { west: -95.3, south: 29.6, east: -93.6, north: 31.1 },
  BRY: { west: -96.8, south: 30.0, east: -95.3, north: 32.0 },
  BWD: { west: -98.9, south: 32.2, east: -98.3, north: 32.7 },
  CHS: { west: -100.5, south: 34.2, east: -99.9, north: 35.4 },
  CRP: { west: -98.4, south: 27.3, east: -96.7, north: 28.8 },
  DAL: { west: -97.5, south: 31.7, east: -95.9, north: 33.6 },
  ELP: { west: -106.8, south: 30.8, east: -103.9, north: 32.2 },
  FTW: { west: -98.6, south: 32.0, east: -96.9, north: 33.4 },
  HOU: { west: -96.2, south: 29.1, east: -94.6, north: 30.7 },
  LBB: { west: -102.1, south: 33.3, east: -101.6, north: 34.3 },
  LRD: { west: -101.1, south: 27.2, east: -98.1, north: 29.6 },
  LFK: { west: -95.1, south: 30.4, east: -94.3, north: 31.8 },
  ODA: { west: -104.2, south: 30.6, east: -101.6, north: 32.5 },
  PAR: { west: -96.8, south: 32.8, east: -95.2, north: 34.0 },
  PHR: { west: -99.1, south: 25.8, east: -97.0, north: 26.5 },
  SAT: { west: -99.6, south: 28.6, east: -97.6, north: 30.4 },
  SJT: { west: -101.4, south: 30.3, east: -99.5, north: 30.9 },
  TYL: { west: -96.2, south: 31.5, east: -94.5, north: 32.8 },
  WAC: { west: -97.9, south: 30.7, east: -96.9, north: 32.4 },
  WFS: { west: -99.5, south: 33.4, east: -97.0, north: 34.3 },
  YKM: { west: -97.6, south: 28.7, east: -95.9, north: 29.9 },
}

function intersects(a: Bbox, b: Bbox): boolean {
  return a.west <= b.east && a.east >= b.west && a.south <= b.north && a.north >= b.south
}

/** Districts whose rough bounds overlap the AOI, in the TXDOT_DISTRICTS order. */
export function districtsForBbox(aoi: Bbox): TxdotDistrict[] {
  return TXDOT_DISTRICTS.filter((code) => intersects(DISTRICT_BBOX[code], aoi))
}
