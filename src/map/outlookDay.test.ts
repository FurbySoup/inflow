import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getOutlookDay,
  outlookCaption,
  setOutlookDay,
  setOutlookLoaded,
  subscribeOutlookDay,
} from './outlookDay'

beforeEach(() => {
  setOutlookDay(1)
  setOutlookLoaded({ day: 1, window: null })
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
})

describe('outlookCaption', () => {
  it('shows the loaded validity window for the selected day', () => {
    setOutlookLoaded({ day: 1, window: { valid: '202610111630', expire: '202610121200' } })
    expect(outlookCaption(1, { day: 1, window: { valid: '202610111630', expire: '202610121200' } })).toBe(
      'SPC D1 · VALID 111630Z–121200Z',
    )
  })

  it('shows a dash when the loaded data belongs to another day or is empty', () => {
    const d1 = { day: 1 as const, window: { valid: '202610111630', expire: '202610121200' } }
    expect(outlookCaption(2, d1)).toBe('SPC D2 · —')
    expect(outlookCaption(4, { day: 4, window: null })).toBe('SPC D4 · —')
    expect(outlookCaption(1, null)).toBe('SPC D1 · —')
  })
})
