import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSource } from '../lib/useSource'
import { useAoi } from '../state/aoi'
import { AlertsList } from './AlertsList'

vi.mock('../lib/useSource', () => ({ useSource: vi.fn() }))

// Only the fields the panel (and its HWO strip) read.
const query = (over: Record<string, unknown>) =>
  ({ data: undefined, isError: false, isPending: false, isFetching: false, dataUpdatedAt: 0, errorUpdatedAt: 0, refetch: vi.fn(), ...over }) as unknown as ReturnType<typeof useSource>

describe('AlertsList empty states (WP-50)', () => {
  beforeEach(() => {
    useAoi.setState({ bbox: { west: -104, south: 31, east: -94, north: 43 }, states: ['KS'], focus: null })
  })
  afterEach(() => {
    cleanup()
    vi.mocked(useSource).mockReset()
  })

  it('says CHECKING NWS before the first answer, never NO WARNINGS', () => {
    vi.mocked(useSource).mockReturnValue(query({ isPending: true, isFetching: true }))
    render(<AlertsList />)
    expect(screen.getByText(/CHECKING/)).toBeTruthy()
    expect(screen.queryByText(/NO WARNINGS/)).toBeNull()
  })

  it('says NO WARNINGS IN THIS AREA once NWS answered with nothing in the area', () => {
    vi.mocked(useSource).mockReturnValue(query({ data: [], dataUpdatedAt: Date.now() }))
    render(<AlertsList />)
    expect(screen.getByText(/NO WARNINGS IN THIS AREA/)).toBeTruthy()
    expect(screen.queryByText(/CHECKING/)).toBeNull()
  })
})
