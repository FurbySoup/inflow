import { cleanup, render } from '@testing-library/react'
import { useQueries } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAoi } from '../state/aoi'
import { CAMERA_SOURCES, CamerasPanel } from './CamerasPanel'

vi.mock('@tanstack/react-query', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-query')>()),
  useQueries: vi.fn(),
}))

const queryResult = (over: Record<string, unknown>) => ({
  data: [],
  isPending: false,
  isError: false,
  dataUpdatedAt: Date.now(),
  ...over,
})

describe('CamerasPanel acronym tips', () => {
  beforeEach(() => {
    useAoi.setState({ states: ['GA', 'SC'] })
  })
  afterEach(() => {
    cleanup()
    vi.mocked(useQueries).mockReset()
  })

  it('tags DOT in the no-coverage text', () => {
    useAoi.setState({ states: ['ZZ'] })
    vi.mocked(useQueries).mockReturnValue(
      CAMERA_SOURCES.map(() => queryResult({ isPending: true, dataUpdatedAt: 0 })) as unknown as ReturnType<
        typeof useQueries
      >,
    )
    const { container } = render(<CamerasPanel />)
    // The panel code (CCTV-01) is also an abbr, so scope to the muted text line.
    const dot = container.querySelector('.muted abbr')
    expect(dot?.textContent).toBe('DOT')
    expect(dot?.getAttribute('title')).toMatch(/^Department of Transportation/)
    expect(container.querySelector('.muted')?.textContent).toMatch(/^NO DOT CAMERA COVERAGE IN AOI — COVERED: /)
  })

  it('tips the agency names in the footer, and only those', () => {
    vi.mocked(useQueries).mockReturnValue(
      CAMERA_SOURCES.map(() => queryResult({})) as unknown as ReturnType<typeof useQueries>,
    )
    render(<CamerasPanel />)
    const footer = [...document.querySelectorAll('p')].find((p) => p.textContent?.startsWith('Snapshots:'))
    expect(footer?.textContent).toBe('Snapshots: 511GA (GA) · 511SC (SC)')
    const tips = [...(footer?.querySelectorAll('abbr') ?? [])].map((a) => [a.textContent, a.getAttribute('title')])
    expect(tips).toEqual([
      ['511GA', 'Georgia DOT traveller site'],
      ['511SC', 'South Carolina DOT traveller site'],
    ])
  })
})
