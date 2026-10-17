import { create } from 'zustand'
import { statesInBbox } from '../lib/states'
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

// Default: the Plains (Texas to Nebraska), the core of chase country, so a first run is useful on any day.
// Evergreen by design (launch-plan §1): never tie the default to a dated event. Same region as the PLAINS preset.
export const DEFAULT_AOI: Bbox = { west: -104, south: 31, east: -94, north: 43 }

export const useAoi = create<AoiState>((set) => ({
  bbox: DEFAULT_AOI,
  states: statesInBbox(DEFAULT_AOI),
  focus: null,
  aoiRequest: null,
  setAoi: (bbox, states) => set({ bbox, states }),
  setFocus: (focus) => set({ focus }),
  requestAoi: (bbox) => set((s) => ({ aoiRequest: { bbox, seq: (s.aoiRequest?.seq ?? 0) + 1 } })),
  clearAoiRequest: () => set({ aoiRequest: null }),
}))
