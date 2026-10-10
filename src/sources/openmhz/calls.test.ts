import { describe, expect, it } from 'vitest'
import raw from './fixtures/calls.json'
import { normalizeCalls, type OpenMhzCallsResponse } from './calls'
import { scannerSystemsFor } from './systems'

describe('normalizeCalls', () => {
  it('keeps https calls with valid times, newest first', () => {
    const calls = normalizeCalls(raw as OpenMhzCallsResponse)
    expect(calls.map((c) => c.url.split('/').pop())).toEqual([
      'newest.mp3',
      'middle.mp3',
      'older.mp3',
    ])
    expect(calls[0].talkgroup).toBe(4117)
    expect(calls[1].talkgroup).toBeNull()
  })

  it('accepts a bare array response', () => {
    const calls = normalizeCalls(raw.calls as OpenMhzCallsResponse)
    expect(calls).toHaveLength(3)
  })
})

describe('scannerSystemsFor', () => {
  it('returns no systems for GA/SC (none curated)', () => {
    expect(scannerSystemsFor(['GA', 'SC'])).toEqual([])
  })

  it('returns Kansas and Oklahoma systems tagged with their state', () => {
    const systems = scannerSystemsFor(['OK', 'KS'])
    expect(systems[0]).toEqual({ shortName: 'normanok', state: 'OK' })
    expect(systems.filter((s) => s.state === 'KS')).toHaveLength(5)
  })
})
