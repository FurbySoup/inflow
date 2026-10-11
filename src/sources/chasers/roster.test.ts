import { describe, expect, it } from 'vitest'

import { ROSTER } from './roster'

describe('chaser roster (config/chasers.json)', () => {
  it('has the verified 58 entries: 54 chasers and 4 coverage outlets', () => {
    expect(ROSTER).toHaveLength(58)
    expect(ROSTER.filter((c) => c.kind === 'coverage')).toHaveLength(4)
    expect(ROSTER.filter((c) => c.kind === 'chaser')).toHaveLength(54)
  })

  it('every channelId is a well-formed YouTube channel ID and unique', () => {
    const ids = ROSTER.map((c) => c.channelId)
    for (const id of ids) expect(id).toMatch(/^UC[A-Za-z0-9_-]{22}$/)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every entry id is unique', () => {
    const ids = ROSTER.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
