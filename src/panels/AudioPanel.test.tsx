import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSource } from '../lib/useSource'
import { useAoi } from '../state/aoi'
import { AudioPanel, worstStatus } from './AudioPanel'

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

describe('AudioPanel default system', () => {
  const INITIAL_STATES = useAoi.getState().states
  const alabama = { shortName: 'afrn', name: 'Alabama Interoperable', state: 'AL', place: '', lastActive: '' }
  const kansas = { shortName: 'ksfire', name: 'Kansas Fire', state: 'KS', place: 'Wichita', lastActive: '' }
  const oklahoma = { shortName: 'okpd', name: 'Oklahoma Police', state: 'OK', place: 'Tulsa', lastActive: '' }

  beforeEach(() => {
    vi.mocked(useSource).mockImplementation(((adapter: { id: string }) =>
      adapter.id === 'openmhz-systems'
        ? { ...empty, data: [alabama, oklahoma, kansas] }
        : empty) as unknown as typeof useSource)
  })
  afterEach(() => {
    cleanup()
    vi.mocked(useSource).mockReset()
    useAoi.setState({ states: INITIAL_STATES })
  })

  it('opens on the nearest state\'s system, not the first alphabetically', () => {
    useAoi.setState({ states: ['KS', 'OK', 'AL'] })
    render(<AudioPanel />)
    expect((screen.getByLabelText('Scanner system') as HTMLSelectElement).value).toBe('ksfire')
  })

  it('shows the recorded-calls hint under the system select', () => {
    useAoi.setState({ states: ['KS'] })
    render(<AudioPanel />)
    expect(lineWith('Recorded calls from public-safety radio, newest first.')).toBeTruthy()
  })
})

describe('worstStatus', () => {
  it('ranks error over loading over live', () => {
    expect(worstStatus('error', 'loading')).toBe('error')
    expect(worstStatus('loading', 'error')).toBe('error')
    expect(worstStatus('loading', 'live')).toBe('loading')
    expect(worstStatus('live', 'loading')).toBe('loading')
    expect(worstStatus('live', 'live')).toBe('live')
    expect(worstStatus('error', 'error')).toBe('error')
  })

  it('ranks stale below loading and above live', () => {
    expect(worstStatus('stale', 'live')).toBe('stale')
    expect(worstStatus('loading', 'stale')).toBe('loading')
  })
})

describe('AudioPanel LED', () => {
  const healthy = { data: [], isPending: false, isError: false, dataUpdatedAt: Date.now() }
  const scannerFailed = { data: undefined, isPending: false, isError: true, dataUpdatedAt: 0 }
  const scannerLoading = { data: undefined, isPending: true, isError: false, dataUpdatedAt: 0 }

  // Each adapter gets its own result, keyed by the adapter id (see the source modules).
  function feeds(scanner: object, directory: object) {
    vi.mocked(useSource).mockImplementation((adapter) => {
      if (adapter.id === 'openmhz-systems') return scanner as ReturnType<typeof useSource>
      if (adapter.id === 'kiwisdr-directory') return directory as ReturnType<typeof useSource>
      return empty
    })
  }

  afterEach(() => {
    cleanup()
    vi.mocked(useSource).mockReset()
    useAoi.setState({ states: ['GA', 'SC'] })
  })

  it('shows an error LED when OpenMHz fails, even with a healthy KiwiSDR directory', () => {
    feeds(scannerFailed, healthy)
    const { container } = render(<AudioPanel />)
    expect(container.querySelector('.led')?.getAttribute('data-status')).toBe('error')
    expect(lineWith('OPENMHZ UNAVAILABLE')).toBeTruthy()
  })

  it('shows a loading LED while OpenMHz is pending and KiwiSDR is live', () => {
    feeds(scannerLoading, healthy)
    const { container } = render(<AudioPanel />)
    expect(container.querySelector('.led')?.getAttribute('data-status')).toBe('loading')
  })

  it('shows a live LED when both feeds are healthy', () => {
    feeds(healthy, healthy)
    const { container } = render(<AudioPanel />)
    expect(container.querySelector('.led')?.getAttribute('data-status')).toBe('live')
  })

  it('labels the duplicate-named Alabama systems apart in the picker', () => {
    // Real pair from the live list (2026-10-13): same name and state, neither has a place.
    const afrn = { shortName: 'afrn', name: 'Alabama Interoperable Radio System', state: 'AL', place: '', lastActive: '2026-10-13T00:00:00.000Z' }
    const airs = { ...afrn, shortName: 'airs' }
    useAoi.setState({ states: ['AL'] })
    feeds({ ...healthy, data: [afrn, airs] }, healthy)
    const { container } = render(<AudioPanel />)
    const options = [...container.querySelectorAll('option')].map((o) => o.textContent)
    expect(options).toEqual([
      'Alabama Interoperable Radio System (AL) · afrn',
      'Alabama Interoperable Radio System (AL) · airs',
    ])
  })
})
