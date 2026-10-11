import { describe, expect, it } from 'vitest'
import raw from './fixtures/calls.json'
import { normalizeCalls, type OpenMhzCallsResponse } from './calls'

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
