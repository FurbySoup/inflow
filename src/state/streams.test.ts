import { beforeEach, describe, expect, it } from 'vitest'
import { stepPrimary, useStreams } from './streams'

describe('stepPrimary', () => {
  const order = ['a', 'b', 'c']

  it('steps forward and back with wrap-around', () => {
    expect(stepPrimary(order, 'a', 1)).toBe('b')
    expect(stepPrimary(order, 'c', 1)).toBe('a')
    expect(stepPrimary(order, 'a', -1)).toBe('c')
  })

  it('starts from the first feed when the current id is unknown or null', () => {
    expect(stepPrimary(order, 'gone', 1)).toBe('a')
    expect(stepPrimary(order, null, -1)).toBe('a')
  })

  it('returns null for an empty order', () => {
    expect(stepPrimary([], 'a', 1)).toBeNull()
  })
})

describe('useStreams.cyclePrimary', () => {
  beforeEach(() => useStreams.setState({ primaryId: null, order: [], shownId: null, chosenThisSession: false }))

  it('marks a pick as made this session', () => {
    useStreams.getState().setPrimary('a')
    expect(useStreams.getState().chosenThisSession).toBe(true)
  })

  it('cycles from the feed actually shown, through the sorted order', () => {
    useStreams.getState().setOrder(['a', 'b', 'c'], 'b')
    useStreams.getState().cyclePrimary(1)
    expect(useStreams.getState().primaryId).toBe('c')
  })

  it('walks every feed instead of flipping between two', () => {
    const seen: (string | null)[] = []
    useStreams.getState().setOrder(['a', 'b', 'c'], 'a')
    for (let i = 0; i < 3; i++) {
      useStreams.getState().cyclePrimary(1)
      const id = useStreams.getState().primaryId
      seen.push(id)
      useStreams.getState().setOrder(['a', 'b', 'c'], id) // the grid republishes after each pick
    }
    expect(seen).toEqual(['b', 'c', 'a'])
  })

  it('does nothing before the grid has published an order', () => {
    useStreams.getState().cyclePrimary(1)
    expect(useStreams.getState().primaryId).toBeNull()
  })

  it('ignores a republished identical order', () => {
    useStreams.getState().setOrder(['a', 'b'], 'a')
    const before = useStreams.getState().order
    useStreams.getState().setOrder(['a', 'b'], 'a')
    expect(useStreams.getState().order).toBe(before)
  })
})
