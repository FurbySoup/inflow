import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  expectedDayLabel,
  getOutlookDay,
  getOutlookLoading,
  outlookCaption,
  setOutlookDay,
  setOutlookLoaded,
  setOutlookLoading,
  subscribeOutlookDay,
  utcDayLabel,
  validDayLabel,
  type LoadedOutlook,
} from './outlookDay'

const D1_WINDOW = { valid: '202610111630', expire: '202610121200' }
const d1Loaded: LoadedOutlook = { day: 1, window: D1_WINDOW, highest: 'SLGT', emptyLabel: null }
const d5Empty: LoadedOutlook = {
  day: 5,
  window: { valid: '202610151200', expire: '202610161200' },
  highest: null,
  emptyLabel: 'Predictability Too Low',
}

beforeEach(() => {
  setOutlookDay(1)
  setOutlookLoading(null)
  setOutlookLoaded({ day: 1, window: null, highest: null, emptyLabel: null })
})

describe('outlook day store', () => {
  it('defaults to day 1 and stores the selected day', () => {
    expect(getOutlookDay()).toBe(1)
    setOutlookDay(5)
    expect(getOutlookDay()).toBe(5)
  })

  it('notifies subscribers on change, and not when the day is unchanged', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeOutlookDay(listener)
    setOutlookDay(2)
    expect(listener).toHaveBeenCalledTimes(1)
    setOutlookDay(2)
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
  })

  it('stops notifying after unsubscribe', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeOutlookDay(listener)
    unsubscribe()
    setOutlookDay(3)
    expect(listener).not.toHaveBeenCalled()
  })

  it('tracks the loading day and clears it when that day loads', () => {
    setOutlookLoading(3)
    expect(getOutlookLoading()).toBe(3)
    setOutlookLoaded({ day: 2, window: null, highest: null, emptyLabel: null })
    expect(getOutlookLoading()).toBe(3)
    setOutlookLoaded({ day: 3, window: null, highest: 'TSTM', emptyLabel: null })
    expect(getOutlookLoading()).toBeNull()
  })
})

describe('date labels', () => {
  it('reads the UTC day of a VALID stamp, not the local one', () => {
    expect(validDayLabel('202610111630')).toBe('Sun 11 Oct')
    expect(validDayLabel('202610120000')).toBe('Mon 12 Oct')
  })

  it('returns null for a malformed stamp', () => {
    expect(validDayLabel('')).toBeNull()
    expect(validDayLabel('2026-10-11')).toBeNull()
  })

  it('names the expected valid day of Day N from today, D1 being today', () => {
    const now = new Date('2026-10-11T23:30:00Z')
    expect(expectedDayLabel(1, now)).toBe('Sun 11 Oct')
    expect(expectedDayLabel(2, now)).toBe('Mon 12 Oct')
    expect(expectedDayLabel(8, now)).toBe('Sun 18 Oct')
  })

  it('formats a UTC date with a zero-padded day', () => {
    expect(utcDayLabel(new Date(Date.UTC(2026, 9, 5)))).toBe('Mon 05 Oct')
  })
})

describe('outlookCaption', () => {
  const text = (c: { before: string; term: string | null }) => c.before + (c.term ?? '')

  it('gives the date from VALID and the highest category for a loaded day with polygons', () => {
    const c = outlookCaption(1, d1Loaded, null)
    expect(text(c)).toBe('D1 · SUN 11 OCT · HIGHEST SLGT')
    expect(c.term).toBe('SLGT')
  })

  it('says why a Day 4–8 outlook is empty, with its VALID date', () => {
    const c = outlookCaption(5, d5Empty, null)
    expect(text(c)).toBe('D5 · THU 15 OCT · PREDICTABILITY TOO LOW')
    expect(c.term).toBe('PREDICTABILITY TOO LOW')
  })

  it('reads LOADING for the day in flight, even when another day is on the map', () => {
    expect(text(outlookCaption(3, d1Loaded, 3))).toBe('LOADING D3…')
    expect(text(outlookCaption(1, d1Loaded, 3))).toBe('D1 · SUN 11 OCT · HIGHEST SLGT')
  })

  it('says NOT LOADED when nothing for the selected day has arrived', () => {
    expect(text(outlookCaption(2, d1Loaded, null))).toBe('D2 · NOT LOADED')
    expect(text(outlookCaption(1, null, null))).toBe('D1 · NOT LOADED')
  })

  it('says NO POLYGONS for a loaded day with neither polygons nor a placeholder label', () => {
    expect(text(outlookCaption(1, { day: 1, window: null, highest: null, emptyLabel: null }, null))).toBe(
      'D1 · NO POLYGONS',
    )
  })
})
