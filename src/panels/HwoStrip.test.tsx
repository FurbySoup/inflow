import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSource } from '../lib/useSource'
import type { Hwo } from '../sources/nws/hwo'
import { HwoStrip } from './HwoStrip'

vi.mock('../lib/useSource', () => ({ useSource: vi.fn() }))

const URL_FFC = 'https://forecast.weather.gov/product.php?site=FFC&issuedby=FFC&product=HWO&format=txt'

const hwo: Hwo = {
  cwa: 'FFC',
  issued: Date.UTC(2026, 9, 11, 9, 51),
  dayOne: 'Gusty winds this afternoon may cause additional tree damage.',
  daysTwoToSeven: 'No hazardous weather conditions expected.',
  spotterActivation: false,
  url: URL_FFC,
}

const mockQuery = (over: Partial<{ data: Hwo[] | undefined; isPending: boolean; isError: boolean }>) =>
  vi.mocked(useSource).mockReturnValue({
    data: undefined,
    isPending: false,
    isError: false,
    ...over,
  } as ReturnType<typeof useSource>)

beforeEach(() => mockQuery({ data: [hwo] }))
afterEach(cleanup)

describe('HwoStrip', () => {
  it('is collapsed by default: one line with the office, issue time and spotter flag', () => {
    render(<HwoStrip />)
    const toggle = screen.getByRole('button')
    expect(toggle.textContent).toBe('▸ HWO · FFC · ISSUED 0951Z · SPOTTERS: NOT NEEDED')
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByText(hwo.dayOne)).toBeNull()
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('expands on click to the Day One text, the Days 2-7 text and a full-text link-out', () => {
    render(<HwoStrip />)
    const toggle = screen.getByRole('button')
    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByText(hwo.dayOne)).toBeTruthy()
    expect(screen.getByText(hwo.daysTwoToSeven)).toBeTruthy()
    const link = screen.getByRole('link', { name: /FULL TEXT/ })
    expect(link.getAttribute('href')).toBe(URL_FFC)
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toBe('noopener noreferrer')
    fireEvent.click(toggle)
    expect(screen.queryByText(hwo.dayOne)).toBeNull()
  })

  it('shows SPOTTERS: NEEDED when the product asks for activation', () => {
    mockQuery({ data: [{ ...hwo, spotterActivation: true }] })
    render(<HwoStrip />)
    expect(screen.getByRole('button').textContent).toContain('SPOTTERS: NEEDED')
  })

  it('renders nothing while loading and when the office has no HWO', () => {
    mockQuery({ data: undefined, isPending: true })
    const { container, rerender } = render(<HwoStrip />)
    expect(container.innerHTML).toBe('')
    mockQuery({ data: [] })
    rerender(<HwoStrip />)
    expect(container.innerHTML).toBe('')
  })

  it('shows a muted HWO UNAVAILABLE on a failed request, with no error banner', () => {
    mockQuery({ data: undefined, isError: true })
    render(<HwoStrip />)
    expect(screen.getByText('HWO UNAVAILABLE')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
