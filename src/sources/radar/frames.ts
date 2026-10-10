import { IEM_TILE_BASE } from './iem'

/** Minutes before the newest frame, oldest first: 50, 45 … 5, 0 (11 frames, 5-minute steps). */
export const FRAME_OFFSETS_MIN: readonly number[] = [50, 45, 40, 35, 30, 25, 20, 15, 10, 5, 0]

const pad2 = (n: number) => String(n).padStart(2, '0')

/** MapLibre source id for one frame, e.g. `radar-m05`. Layer ids use the same prefix. */
export function frameSourceId(offsetMin: number): string {
  return `radar-m${pad2(offsetMin)}`
}

/** IEM layer name: `nexrad-n0q-900913` for the newest frame, `…-m05m` etc. for past frames. */
export function frameLayerName(offsetMin: number): string {
  return offsetMin === 0 ? 'nexrad-n0q-900913' : `nexrad-n0q-900913-m${pad2(offsetMin)}m`
}

export function frameTileUrl(offsetMin: number, bustKey?: number): string {
  const query = bustKey === undefined ? '' : `?t=${bustKey}`
  return `${IEM_TILE_BASE}${frameLayerName(offsetMin)}/{z}/{x}/{y}.png${query}`
}

/** Valid time of the frame `offsetMin` minutes before a composite valid at `validMs`. */
export function frameTimeMs(validMs: number, offsetMin: number): number {
  return validMs - offsetMin * 60_000
}

/** `HH:MMZ` in UTC. */
export function formatUtcHHMM(ms: number): string {
  const d = new Date(ms)
  return `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}Z`
}

/** Reads `meta.valid` (ISO-8601 UTC) from the IEM frame-time JSON. Returns epoch ms or null. */
export function parseValidTime(json: unknown): number | null {
  if (typeof json !== 'object' || json === null || !('meta' in json)) return null
  const meta = json.meta
  if (typeof meta !== 'object' || meta === null || !('valid' in meta)) return null
  const valid = meta.valid
  if (typeof valid !== 'string') return null
  const ms = Date.parse(valid)
  return Number.isNaN(ms) ? null : ms
}
