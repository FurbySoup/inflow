import type { Bbox, CameraFeed } from '../../types'
import type { SourceAdapter } from '../types'
import { districtsForBbox, type TxdotDistrict } from './districts'

// TxDOT ITS (Texas). No CORS, so every call goes through the same-origin /api/txdot proxy (ADR-0005).
// Snapshots are base64 JPEG inside JSON; see snapshot.ts for decoding.
export const TXDOT_ID_PREFIX = 'txdot:'
const LIST_PATH = '/api/txdot/its/DistrictIts/GetCctvStatusListByDistrict'
const SNAPSHOT_PATH = '/api/txdot/its/DistrictIts/GetCctvSnapshotByIcdId'

export interface TxdotCctv {
  icd_Id: string
  name: string
  latitude: number
  longitude: number
  hasSnapshot: boolean
}

export interface TxdotListResponse {
  cctvStatusRoadways?: unknown[]
  roadwayCctvStatuses?: Record<string, TxdotCctv[]>
}

export interface TxdotRaw {
  districts: { code: TxdotDistrict; list: TxdotListResponse }[]
}

export interface TxdotAdapter extends SourceAdapter<TxdotRaw, CameraFeed> {
  state: string
}

export function snapshotProxyUrl(icdId: string, districtCode: string): string {
  return `${SNAPSHOT_PATH}?icdId=${encodeURIComponent(icdId)}&districtCode=${districtCode}`
}

export function isTxdotFeed(cam: CameraFeed): boolean {
  return cam.id.startsWith(TXDOT_ID_PREFIX)
}

export const txdotCameras: TxdotAdapter = {
  id: 'tx-cameras',
  state: 'TX',
  refreshMs: 5 * 60_000,
  async fetch(aoi: Bbox, signal?: AbortSignal) {
    const codes = districtsForBbox(aoi)
    const settled = await Promise.allSettled(
      codes.map(async (code) => {
        const res = await fetch(`${LIST_PATH}?districtCode=${code}`, { signal })
        if (!res.ok) throw new Error(`TxDOT ${code} ${res.status}`)
        return { code, list: (await res.json()) as TxdotListResponse }
      }),
    )
    const districts = settled.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []))
    // One district failing should not hide the rest; only a total failure is an error.
    if (codes.length > 0 && districts.length === 0) throw new Error('TxDOT camera lists unavailable')
    return { districts }
  },
  normalize(raw) {
    const cameras: CameraFeed[] = []
    const seen = new Set<string>()
    for (const { code, list } of raw.districts) {
      for (const cctvs of Object.values(list.roadwayCctvStatuses ?? {})) {
        for (const c of cctvs) {
          const id = `${TXDOT_ID_PREFIX}${code}:${c.icd_Id}`
          // The same device can be listed under two roadways; keep the first.
          if (seen.has(id)) continue
          // Latitude/longitude of 0 or missing values mean no usable location.
          if (!c.hasSnapshot || !Number.isFinite(c.latitude) || !Number.isFinite(c.longitude)) continue
          if (c.latitude === 0 || c.longitude === 0) continue
          seen.add(id)
          cameras.push({
            id,
            title: c.name,
            location: [c.longitude, c.latitude],
            snapshotUrl: snapshotProxyUrl(c.icd_Id, code),
            streamUrl: null,
            state: 'TX',
          })
        }
      }
    }
    return cameras
  },
}
