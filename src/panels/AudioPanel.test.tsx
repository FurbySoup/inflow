import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSource } from '../lib/useSource'
import { AudioPanel } from './AudioPanel'

vi.mock('../lib/useSource', () => ({ useSource: vi.fn() }))

// Every feed returns an empty list: the systems and receivers branches show their static text.
const empty = { data: [], isPending: false, isError: false, dataUpdatedAt: 0 } as unknown as ReturnType<typeof useSource>

const tipOf = (text: string) =>
  [...document.querySelectorAll('abbr')].find((a) => a.textContent === text)?.getAttribute('title')

// Matches on the whole element text, since the abbrs split a line into several text nodes.
const lineWith = (text: string) => [...document.querySelectorAll('p')].find((p) => p.textContent === text)

describe('AudioPanel acronym tips', () => {
  beforeEach(() => {
    vi.mocked(useSource).mockReturnValue(empty)
  })
  afterEach(() => {
    cleanup()
    vi.mocked(useSource).mockReset()
  })

  it('tags the radio acronyms and keeps the visible lines', () => {
    render(<AudioPanel />)
    expect(tipOf('OPENMHZ')).toMatch(/^OpenMHz/)
    expect(tipOf('CB')).toMatch(/^Citizens Band/)
    expect(tipOf('2M')).toMatch(/^The 2-metre/)
    expect(tipOf('KIWISDR')).toMatch(/^KiwiSDR/)
    expect(tipOf('MHZ')).toMatch(/^Megahertz/)
    expect(tipOf('AOI')).toMatch(/^Area of interest/)
    expect(lineWith('SCANNER · OPENMHZ')).toBeTruthy()
    expect(lineWith('CB 19 / 2M · KIWISDR LINK-OUT')).toBeTruthy()
  })

  it('keeps the no-systems and no-receivers text unchanged', () => {
    render(<AudioPanel />)
    expect(lineWith('NO OPENMHZ SYSTEMS IN AOI')).toBeTruthy()
    expect(lineWith('NO ONLINE 27 MHZ RECEIVERS IN RANGE')).toBeTruthy()
  })
})
