import { beforeEach, describe, expect, it } from 'vitest'
import { MAX_MY_CHASERS, MY_CHASERS_KEY, loadMyChasers, useMyChasers, type MyChaser } from './myChasers'

const chaser = (n: number, over: Partial<MyChaser> = {}): MyChaser => ({
  channelId: `UC${String(n).padStart(22, '0')}`,
  name: `Chaser ${n}`,
  handle: `@chaser${n}`,
  states: [],
  addedAt: 1,
  ...over,
})

describe('loadMyChasers', () => {
  it('returns [] for nothing stored, bad JSON or a non-array', () => {
    expect(loadMyChasers(() => null)).toEqual([])
    expect(loadMyChasers(() => '{oops')).toEqual([])
    expect(loadMyChasers(() => '{"a":1}')).toEqual([])
  })

  it('drops malformed entries and duplicate channels', () => {
    const stored = [chaser(1), chaser(1), { ...chaser(2), channelId: 'not-a-channel' }, { ...chaser(3), states: ['Kansas'] }, chaser(4)]
    expect(loadMyChasers(() => JSON.stringify(stored)).map((c) => c.name)).toEqual(['Chaser 1', 'Chaser 4'])
  })

  it('caps the list', () => {
    const stored = Array.from({ length: MAX_MY_CHASERS + 5 }, (_, i) => chaser(i))
    expect(loadMyChasers(() => JSON.stringify(stored))).toHaveLength(MAX_MY_CHASERS)
  })
})

describe('useMyChasers', () => {
  beforeEach(() => {
    localStorage.clear()
    useMyChasers.setState({ chasers: [] })
  })

  it('adds, persists, rejects duplicates and removes', () => {
    expect(useMyChasers.getState().add(chaser(1, { states: ['KS'] }))).toBe('added')
    expect(useMyChasers.getState().add(chaser(1))).toBe('duplicate')
    expect(JSON.parse(localStorage.getItem(MY_CHASERS_KEY) ?? '[]')).toHaveLength(1)
    useMyChasers.getState().remove(chaser(1).channelId)
    expect(useMyChasers.getState().chasers).toEqual([])
    expect(localStorage.getItem(MY_CHASERS_KEY)).toBe('[]')
  })

  it('rejects an invalid entry and a full list', () => {
    expect(useMyChasers.getState().add({ ...chaser(1), channelId: 'x' })).toBe('invalid')
    useMyChasers.setState({ chasers: Array.from({ length: MAX_MY_CHASERS }, (_, i) => chaser(i)) })
    expect(useMyChasers.getState().add(chaser(999))).toBe('full')
  })
})
