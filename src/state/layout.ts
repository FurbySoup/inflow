import { create } from 'zustand'

// Dashboard layout preferences (ADR-0011). Per-viewer, persisted to localStorage.
// Extend this store for later customization rather than adding new ones.

export interface LayoutSizes {
  /** Width of the right-hand feeds column, px. */
  sideWidth: number
  /** Height of the bottom console row, px. */
  bottomHeight: number
}

/** Fractions of the console row for its three panels. Sums to 1, each >= CONSOLE_MIN. */
export type ConsoleSplit = [number, number, number]

export interface LayoutSnapshot extends LayoutSizes {
  consoleSplit: ConsoleSplit
  /** Panel codes (`<Panel code>`) the user collapsed to their header bar. */
  hidden: string[]
}

export const DEFAULT_LAYOUT: LayoutSizes = { sideWidth: 400, bottomHeight: 230 }

export const DEFAULT_CONSOLE_SPLIT: ConsoleSplit = [1 / 3, 1 / 3, 1 / 3]

export const CONSOLE_MIN = 0.15

export const LAYOUT_LIMITS = {
  sideWidth: { min: 260, max: 900 },
  bottomHeight: { min: 120, max: 600 },
} as const

export const STORAGE_KEY = 'storm-chasers.layout.v2'
const LEGACY_KEY = 'storm-chasers.layout.v1'

export const PRESETS: Record<'DEFAULT' | 'WALL' | 'CHASE', LayoutSnapshot> = {
  DEFAULT: { ...DEFAULT_LAYOUT, consoleSplit: DEFAULT_CONSOLE_SPLIT, hidden: [] },
  WALL: { sideWidth: 560, bottomHeight: 300, consoleSplit: DEFAULT_CONSOLE_SPLIT, hidden: [] },
  CHASE: {
    sideWidth: 300,
    bottomHeight: 160,
    consoleSplit: DEFAULT_CONSOLE_SPLIT,
    hidden: ['AUD-01', 'CCTV-01'],
  },
}

export type PresetName = keyof typeof PRESETS

export const clamp = (key: keyof LayoutSizes, value: number) =>
  Math.round(Math.min(LAYOUT_LIMITS[key].max, Math.max(LAYOUT_LIMITS[key].min, value)))

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/** Valid fractions summing to 1, or the equal split when the input is unusable. */
export function normalizeSplit(value: unknown): ConsoleSplit {
  if (!Array.isArray(value) || value.length !== 3) return DEFAULT_CONSOLE_SPLIT
  if (!value.every((v) => isFiniteNumber(v) && v > 0)) return DEFAULT_CONSOLE_SPLIT
  const [a, b, c] = value as number[]
  const sum = a + b + c
  const fractions: ConsoleSplit = [a / sum, b / sum, c / sum]
  return fractions.every((f) => f >= CONSOLE_MIN) ? fractions : DEFAULT_CONSOLE_SPLIT
}

/**
 * Moves the boundary between console panel `boundary` and `boundary + 1` so the left panel
 * gets `leftFraction`, clamped so both panels keep at least CONSOLE_MIN. Other panels are untouched.
 */
export function resizeConsoleSplit(
  split: ConsoleSplit,
  boundary: 0 | 1,
  leftFraction: number,
): ConsoleSplit {
  const total = split[boundary] + split[boundary + 1]
  const left = Math.min(total - CONSOLE_MIN, Math.max(CONSOLE_MIN, leftFraction))
  const next: ConsoleSplit = [...split]
  next[boundary] = left
  next[boundary + 1] = total - left
  return next
}

/** Parses a saved snapshot. Any bad field falls back to its default; never throws. */
export function parseSnapshot(raw: unknown): LayoutSnapshot {
  if (!isRecord(raw)) return snapshotDefaults()
  const size = (key: keyof LayoutSizes): number =>
    isFiniteNumber(raw[key]) ? clamp(key, raw[key]) : DEFAULT_LAYOUT[key]
  return {
    sideWidth: size('sideWidth'),
    bottomHeight: size('bottomHeight'),
    consoleSplit: normalizeSplit(raw.consoleSplit),
    hidden: Array.isArray(raw.hidden)
      ? [...new Set(raw.hidden.filter((h): h is string => typeof h === 'string'))]
      : [],
  }
}

function snapshotDefaults(): LayoutSnapshot {
  return { ...DEFAULT_LAYOUT, consoleSplit: DEFAULT_CONSOLE_SPLIT, hidden: [] }
}

function readJson(read: (key: string) => string | null, key: string): unknown {
  try {
    const raw = read(key)
    return raw === null ? undefined : JSON.parse(raw)
  } catch {
    return undefined
  }
}

/**
 * Reads the current (v2) snapshot, else migrates a v1 `{sideWidth, bottomHeight}` record forward,
 * else returns defaults. `read` is injected so this is testable without a real localStorage.
 */
export function readStoredLayout(read: (key: string) => string | null): LayoutSnapshot {
  const current = readJson(read, STORAGE_KEY)
  if (current !== undefined) return parseSnapshot(current)
  const legacy = readJson(read, LEGACY_KEY)
  if (legacy !== undefined) return parseSnapshot(legacy)
  return snapshotDefaults()
}

const readLocal = (key: string) => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function save(state: LayoutSnapshot) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage unavailable (private mode etc.): layout just won't persist.
  }
}

/** Trailing-edge throttle for persistence: a drag fires setSize per pointermove, storage needs one write. */
export const SAVE_DELAY_MS = 250

export function createSaver(write: (s: LayoutSnapshot) => void, delayMs = SAVE_DELAY_MS) {
  let pending: LayoutSnapshot | null = null
  let timer: ReturnType<typeof setTimeout> | null = null
  const flush = () => {
    if (timer !== null) clearTimeout(timer)
    timer = null
    if (pending) write(pending)
    pending = null
  }
  const schedule = (s: LayoutSnapshot) => {
    pending = s
    if (timer === null) timer = setTimeout(flush, delayMs)
  }
  return { schedule, flush }
}

const saver = createSaver(save)
// Don't lose the last change if the tab closes inside the throttle window.
if (typeof window !== 'undefined') window.addEventListener('pagehide', saver.flush)

interface LayoutState extends LayoutSnapshot {
  setSize: (key: keyof LayoutSizes, value: number) => void
  reset: (key: keyof LayoutSizes) => void
  /** Moves the console boundary `boundary` (0 or 1) so its left panel gets `leftFraction`. */
  setConsoleSplit: (boundary: 0 | 1, leftFraction: number) => void
  /** Splits the pair around `boundary` evenly. */
  resetConsoleSplit: (boundary: 0 | 1) => void
  toggleHidden: (code: string) => void
  applyPreset: (name: PresetName) => void
}

export const useLayout = create<LayoutState>((set, get) => {
  const commit = (patch: Partial<LayoutSnapshot>) => {
    set(patch)
    const s = get()
    saver.schedule({
      sideWidth: s.sideWidth,
      bottomHeight: s.bottomHeight,
      consoleSplit: s.consoleSplit,
      hidden: s.hidden,
    })
  }

  return {
    ...readStoredLayout(readLocal),
    setSize: (key, value) => commit({ [key]: clamp(key, value) }),
    reset: (key) => get().setSize(key, DEFAULT_LAYOUT[key]),
    setConsoleSplit: (boundary, leftFraction) =>
      commit({ consoleSplit: resizeConsoleSplit(get().consoleSplit, boundary, leftFraction) }),
    resetConsoleSplit: (boundary) => {
      const { consoleSplit } = get()
      const pair = consoleSplit[boundary] + consoleSplit[boundary + 1]
      commit({ consoleSplit: resizeConsoleSplit(consoleSplit, boundary, pair / 2) })
    },
    toggleHidden: (code) => {
      const { hidden } = get()
      commit({
        hidden: hidden.includes(code) ? hidden.filter((h) => h !== code) : [...hidden, code],
      })
    },
    applyPreset: (name) => {
      const p = PRESETS[name]
      commit({
        sideWidth: p.sideWidth,
        bottomHeight: p.bottomHeight,
        consoleSplit: [...p.consoleSplit] as ConsoleSplit,
        hidden: [...p.hidden],
      })
    },
  }
})
