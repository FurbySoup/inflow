import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { expand } from '../ui'
import { OutlookDayControl } from './OutlookDayControl'
import { setOutlookDay, setOutlookLoaded, setOutlookLoading } from './outlookDay'

let control: OutlookDayControl | null = null

function mount(): HTMLElement {
  control = new OutlookDayControl()
  return control.onAdd() as HTMLElement
}

const buttons = (root: HTMLElement) => Array.from(root.querySelectorAll<HTMLButtonElement>('button.btn-console'))
const caption = (root: HTMLElement) => root.querySelector<HTMLSpanElement>('#outlook-day-list > span')

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-11T10:00:00Z'))
  setOutlookDay(1)
  setOutlookLoading(null)
  setOutlookLoaded({ day: 1, window: null, highest: null, emptyLabel: null })
})

afterEach(() => {
  control?.onRemove()
  control = null
  vi.useRealTimers()
})

describe('OutlookDayControl', () => {
  it('labels the buttons D1…D8, each with a title and aria-label naming its valid day', () => {
    const root = mount()
    const btns = buttons(root)
    expect(btns.map((b) => b.textContent)).toEqual(['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8'])
    expect(btns[1].title).toBe('Day 2 outlook: Mon 12 Oct')
    expect(btns[1].getAttribute('aria-label')).toBe('D2 outlook: Mon 12 Oct')
    expect(btns[7].title).toBe('Day 8 outlook: Sun 18 Oct')
  })

  it('gives the head the acronym tip for SPC', () => {
    const root = mount()
    expect(root.querySelector<HTMLButtonElement>('.layer-ctrl-head')?.title).toBe(expand('SPC'))
  })

  it('marks the pressed day and the day in flight, and captions the loading day', () => {
    const root = mount()
    setOutlookDay(3)
    setOutlookLoading(3)
    const btns = buttons(root)
    expect(btns[2].getAttribute('aria-pressed')).toBe('true')
    expect(btns[2].getAttribute('aria-busy')).toBe('true')
    expect(btns[0].hasAttribute('aria-busy')).toBe(false)
    expect(caption(root)?.textContent).toBe('LOADING D3…')
  })

  it('captions a loaded day with its date and highest category, tagged with the category tip', () => {
    const root = mount()
    setOutlookLoaded({
      day: 1,
      window: { valid: '202610111630', expire: '202610121200' },
      highest: 'SLGT',
      emptyLabel: null,
    })
    expect(caption(root)?.textContent).toBe('D1 · SUN 11 OCT · HIGHEST SLGT')
    const abbr = caption(root)?.querySelector('abbr')
    expect(abbr?.textContent).toBe('SLGT')
    expect(abbr?.title).toBe(expand('SLGT'))
  })

  it('explains an empty Day 5 with its label', () => {
    const root = mount()
    setOutlookDay(5)
    setOutlookLoaded({
      day: 5,
      window: { valid: '202610151200', expire: '202610161200' },
      highest: null,
      emptyLabel: 'Predictability Too Low',
    })
    expect(caption(root)?.textContent).toBe('D5 · THU 15 OCT · PREDICTABILITY TOO LOW')
    expect(caption(root)?.querySelector('abbr')).toBeNull()
  })

  it('moves the pressed state when a button is pressed', () => {
    const root = mount()
    buttons(root)[4].click()
    expect(buttons(root)[4].getAttribute('aria-pressed')).toBe('true')
    expect(buttons(root)[0].getAttribute('aria-pressed')).toBe('false')
    expect(root.querySelector('.layer-ctrl-head')?.textContent).toContain('SPC D5')
  })
})
