import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  CONSOLE_MIN,
  type LayoutSnapshot,
  DEFAULT_CONSOLE_SPLIT,
  DEFAULT_LAYOUT,
  LAYOUT_LIMITS,
  PRESETS,
  STORAGE_KEY,
  clamp,
  createSaver,
  normalizeSplit,
  parseSnapshot,
  readStoredLayout,
  SAVE_DELAY_MS,
  resizeConsoleSplit,
  useLayout,
} from './layout'

const storage = (entries: Record<string, string>) => (key: string) => entries[key] ?? null
const throwing = () => {
  throw new Error('storage blocked')
}
const DEFAULTS: LayoutSnapshot = { ...PRESETS.DEFAULT }

describe('clamp', () => {
  it('clamps sizes to LAYOUT_LIMITS and rounds', () => {
    expect(clamp('sideWidth', 10)).toBe(LAYOUT_LIMITS.sideWidth.min)
    expect(clamp('sideWidth', 5000)).toBe(LAYOUT_LIMITS.sideWidth.max)
    expect(clamp('bottomHeight', 200.6)).toBe(201)
  })
})

describe('normalizeSplit', () => {
  it('scales any positive triple to fractions summing to 1', () => {
    const split = normalizeSplit([2, 1, 1])
    expect(split).toHaveLength(3)
    expect(split[0]).toBeCloseTo(0.5)
    expect(split[1]).toBeCloseTo(0.25)
    expect(split[2]).toBeCloseTo(0.25)
    expect(split.reduce((a, b) => a + b, 0)).toBeCloseTo(1)
  })

  it('falls back to the equal split for unusable input', () => {
    expect(normalizeSplit(undefined)).toEqual(DEFAULT_CONSOLE_SPLIT)
    expect(normalizeSplit([1, 2])).toEqual(DEFAULT_CONSOLE_SPLIT)
    expect(normalizeSplit([1, 'x', 1])).toEqual(DEFAULT_CONSOLE_SPLIT)
    expect(normalizeSplit([1, -1, 1])).toEqual(DEFAULT_CONSOLE_SPLIT)
    expect(normalizeSplit([0.95, 0.025, 0.025])).toEqual(DEFAULT_CONSOLE_SPLIT)
  })
})

describe('resizeConsoleSplit', () => {
  it('moves only the pair around the boundary and keeps the pair total', () => {
    const next = resizeConsoleSplit([0.2, 0.3, 0.5], 0, 0.3)
    expect(next[0]).toBeCloseTo(0.3)
    expect(next[1]).toBeCloseTo(0.2)
    expect(next[2]).toBeCloseTo(0.5)
  })

  it('enforces the minimum fraction on both sides of the boundary', () => {
    const shrunk = resizeConsoleSplit(DEFAULT_CONSOLE_SPLIT, 1, 0)
    expect(shrunk[1]).toBeCloseTo(CONSOLE_MIN)
    const grown = resizeConsoleSplit(DEFAULT_CONSOLE_SPLIT, 1, 10)
    expect(grown[2]).toBeCloseTo(CONSOLE_MIN)
    expect(grown.reduce((a, b) => a + b, 0)).toBeCloseTo(1)
  })
})

describe('readStoredLayout', () => {
  it('returns defaults when nothing is stored', () => {
    expect(readStoredLayout(storage({}))).toEqual(DEFAULTS)
  })

  it('reads a v3 record with its preset', () => {
    const s = readStoredLayout(
      storage({ [STORAGE_KEY]: JSON.stringify({ ...PRESETS.WALL }) }),
    )
    expect(s.preset).toBe('WALL')
    expect(s.hidden).toEqual(['AUD-01', 'CCTV-01'])
  })

  it('migrates a v1 {sideWidth, bottomHeight} record forward as preset DEFAULT', () => {
    const s = readStoredLayout(
      storage({ 'storm-chasers.layout.v1': JSON.stringify({ sideWidth: 520, bottomHeight: 300 }) }),
    )
    expect(s.sideWidth).toBe(520)
    expect(s.bottomHeight).toBe(300)
    expect(s.preset).toBe('DEFAULT')
    expect(s.consoleSplit).toEqual(DEFAULT_CONSOLE_SPLIT)
    expect(s.hidden).toEqual([])
  })

  it('migrates a v2 record forward as preset DEFAULT, keeping its sizes and collapse set', () => {
    const s = readStoredLayout(
      storage({
        'storm-chasers.layout.v2': JSON.stringify({ sideWidth: 300, bottomHeight: 160, hidden: ['AUD-01'] }),
      }),
    )
    expect(s).toMatchObject({ preset: 'DEFAULT', sideWidth: 300, bottomHeight: 160, hidden: ['AUD-01'] })
  })

  it('prefers the v3 record over leftover v2 and v1 records', () => {
    const s = readStoredLayout(
      storage({
        [STORAGE_KEY]: JSON.stringify({ preset: 'CHASE', sideWidth: 300, bottomHeight: 160, hidden: ['CCTV-01'] }),
        'storm-chasers.layout.v2': JSON.stringify({ sideWidth: 700, bottomHeight: 500 }),
        'storm-chasers.layout.v1': JSON.stringify({ sideWidth: 900, bottomHeight: 600 }),
      }),
    )
    expect(s.preset).toBe('CHASE')
    expect(s.sideWidth).toBe(300)
    expect(s.hidden).toEqual(['CCTV-01'])
  })

  it('falls back to defaults on corrupt JSON or blocked storage', () => {
    expect(readStoredLayout(storage({ [STORAGE_KEY]: '{not json' }))).toEqual(DEFAULTS)
    expect(readStoredLayout(storage({ [STORAGE_KEY]: 'null' }))).toEqual(DEFAULTS)
    expect(readStoredLayout(throwing)).toEqual(DEFAULTS)
  })
})

describe('parseSnapshot', () => {
  it('clamps out-of-range sizes and drops bad fields individually', () => {
    const s = parseSnapshot({
      sideWidth: 99999,
      bottomHeight: 'tall',
      consoleSplit: [1, 1, 'x'],
      hidden: ['WX-02', 7, 'WX-02', 'CCTV-01'],
    })
    expect(s.sideWidth).toBe(LAYOUT_LIMITS.sideWidth.max)
    expect(s.bottomHeight).toBe(DEFAULT_LAYOUT.bottomHeight)
    expect(s.consoleSplit).toEqual(DEFAULT_CONSOLE_SPLIT)
    expect(s.hidden).toEqual(['WX-02', 'CCTV-01'])
    expect(s.preset).toBe('DEFAULT')
  })

  it('keeps a known preset name and resets an unknown one to DEFAULT', () => {
    expect(parseSnapshot({ preset: 'WALL' }).preset).toBe('WALL')
    expect(parseSnapshot({ preset: 'MOBILE' }).preset).toBe('DEFAULT')
    expect(parseSnapshot({ preset: 3 }).preset).toBe('DEFAULT')
  })
})

describe('PRESETS', () => {
  it('matches the spec sizes and collapse sets', () => {
    expect(PRESETS.WALL).toMatchObject({ preset: 'WALL', sideWidth: 560, bottomHeight: 300 })
    expect(PRESETS.CHASE).toMatchObject({ preset: 'CHASE', sideWidth: 300, bottomHeight: 160 })
    expect(PRESETS.DEFAULT).toMatchObject({ preset: 'DEFAULT', ...DEFAULT_LAYOUT, hidden: [] })
  })

  it('collapses radio and cams in WALL, only cams in CHASE, nothing in DEFAULT', () => {
    expect(PRESETS.WALL.hidden).toEqual(['AUD-01', 'CCTV-01'])
    expect(PRESETS.CHASE.hidden).toEqual(['CCTV-01'])
    expect(PRESETS.DEFAULT.hidden).toEqual([])
    // Alerts (WX-02) stay open in every preset.
    for (const p of Object.values(PRESETS)) expect(p.hidden).not.toContain('WX-02')
  })
})

describe('applyPreset (store API used by the top bar and Shift+1..3)', () => {
  afterEach(() => {
    vi.useRealTimers()
    useLayout.getState().applyPreset('DEFAULT')
  })

  it('applies each preset name, its collapse set and records the preset', () => {
    const { applyPreset } = useLayout.getState()
    applyPreset('WALL')
    expect(useLayout.getState()).toMatchObject({ preset: 'WALL', hidden: ['AUD-01', 'CCTV-01'] })
    applyPreset('CHASE')
    expect(useLayout.getState()).toMatchObject({ preset: 'CHASE', hidden: ['CCTV-01'] })
    applyPreset('DEFAULT')
    expect(useLayout.getState()).toMatchObject({ preset: 'DEFAULT', hidden: [] })
  })

  it('persists the chosen preset under the v3 key', async () => {
    // Real timers: the saver's throttle timer may already be running from an earlier test.
    useLayout.getState().applyPreset('WALL')
    await new Promise((resolve) => setTimeout(resolve, SAVE_DELAY_MS + 50))
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    expect(saved).toMatchObject({ preset: 'WALL', hidden: ['AUD-01', 'CCTV-01'] })
    expect(parseSnapshot(saved).preset).toBe('WALL')
  })
})

describe('createSaver', () => {
  const snap = (sideWidth: number) => ({ ...DEFAULTS, sideWidth })

  it('coalesces a burst of changes into one trailing write of the latest state', () => {
    vi.useFakeTimers()
    const write = vi.fn()
    const saver = createSaver(write, 250)
    saver.schedule(snap(300))
    saver.schedule(snap(320))
    saver.schedule(snap(340))
    expect(write).not.toHaveBeenCalled()
    vi.advanceTimersByTime(250)
    expect(write).toHaveBeenCalledTimes(1)
    expect(write.mock.calls[0][0].sideWidth).toBe(340)
    vi.useRealTimers()
  })

  it('flush writes the pending state immediately and only once', () => {
    vi.useFakeTimers()
    const write = vi.fn()
    const saver = createSaver(write, 250)
    saver.schedule(snap(500))
    saver.flush()
    vi.advanceTimersByTime(1000)
    expect(write).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })
})
