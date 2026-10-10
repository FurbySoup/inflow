import { create } from 'zustand'
import type { Bbox } from '../types'

// Area of interest: the single piece of cross-panel state. The map writes it; every panel filters by it.
interface AoiState {
  bbox: Bbox
  /** States intersecting the AOI, used to filter zone-based alerts, streams, audio and cameras. */
  states: string[]
  setAoi: (bbox: Bbox, states: string[]) => void
}

// Default: GA/SC live-proofing area (2026-10-10 outbreak).
export const DEFAULT_AOI: Bbox = { west: -85.6, south: 30.4, east: -78.5, north: 35.3 }

export const useAoi = create<AoiState>((set) => ({
  bbox: DEFAULT_AOI,
  states: ['GA', 'SC'],
  setAoi: (bbox, states) => set({ bbox, states }),
}))
