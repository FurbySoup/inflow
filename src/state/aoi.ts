import { create } from 'zustand'
import type { Bbox } from '../types'

/** An item a panel asked the map to fly to and highlight (e.g. a clicked alert). */
export interface AoiFocus {
  id: string
  bbox: Bbox
}

/** A region a control asked the map to show (e.g. an AOI preset). `seq` makes repeat requests distinct. */
export interface AoiRequest {
  bbox: Bbox
  seq: number
}

// Area of interest: the single piece of cross-panel state. The map writes it; every panel filters by it.
interface AoiState {
  bbox: Bbox
  /** States intersecting the AOI, used to filter zone-based alerts, streams, audio and cameras. */
  states: string[]
  focus: AoiFocus | null
  /** Pending "move the map here" request. Only the map consumes it (fitBounds, then clearAoiRequest); its moveend then sets bbox/states as usual. */
  aoiRequest: AoiRequest | null
  setAoi: (bbox: Bbox, states: string[]) => void
  setFocus: (focus: AoiFocus | null) => void
  requestAoi: (bbox: Bbox) => void
  clearAoiRequest: () => void
}

// Default: GA/SC live-proofing area (2026-10-10 outbreak).
export const DEFAULT_AOI: Bbox = { west: -85.6, south: 30.4, east: -78.5, north: 35.3 }

export const useAoi = create<AoiState>((set) => ({
  bbox: DEFAULT_AOI,
  states: ['GA', 'SC'],
  focus: null,
  aoiRequest: null,
  setAoi: (bbox, states) => set({ bbox, states }),
  setFocus: (focus) => set({ focus }),
  requestAoi: (bbox) => set((s) => ({ aoiRequest: { bbox, seq: (s.aoiRequest?.seq ?? 0) + 1 } })),
  clearAoiRequest: () => set({ aoiRequest: null }),
}))
