import { create } from 'zustand'

// Dashboard layout preferences (ADR-0011). Per-viewer, persisted to localStorage.
// Extend this store for later customization (panel visibility, order, presets) rather than adding new ones.

export interface LayoutSizes {
  /** Width of the right-hand feeds column, px. */
  sideWidth: number
  /** Height of the bottom console row, px. */
  bottomHeight: number
}

export const DEFAULT_LAYOUT: LayoutSizes = { sideWidth: 400, bottomHeight: 230 }

export const LAYOUT_LIMITS = {
  sideWidth: { min: 260, max: 900 },
  bottomHeight: { min: 120, max: 600 },
} as const

const STORAGE_KEY = 'storm-chasers.layout.v1'

export const clamp = (key: keyof LayoutSizes, value: number) =>
  Math.round(Math.min(LAYOUT_LIMITS[key].max, Math.max(LAYOUT_LIMITS[key].min, value)))

function load(): LayoutSizes {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<LayoutSizes> | null
    if (!saved) return DEFAULT_LAYOUT
    return {
      sideWidth: clamp('sideWidth', saved.sideWidth ?? DEFAULT_LAYOUT.sideWidth),
      bottomHeight: clamp('bottomHeight', saved.bottomHeight ?? DEFAULT_LAYOUT.bottomHeight),
    }
  } catch {
    return DEFAULT_LAYOUT
  }
}

function save(sizes: LayoutSizes) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sizes))
  } catch {
    // Storage unavailable (private mode etc.): sizes just won't persist.
  }
}

interface LayoutState extends LayoutSizes {
  setSize: (key: keyof LayoutSizes, value: number) => void
  reset: (key: keyof LayoutSizes) => void
}

export const useLayout = create<LayoutState>((set, get) => ({
  ...load(),
  setSize: (key, value) => {
    set({ [key]: clamp(key, value) })
    save({ sideWidth: get().sideWidth, bottomHeight: get().bottomHeight })
  },
  reset: (key) => get().setSize(key, DEFAULT_LAYOUT[key]),
}))
