import { describe, expect, it, vi } from 'vitest'
import { emitNotify, subscribeNotify, type NotifyEvent } from './notify'

const event: NotifyEvent = { kind: 'chaser-live', key: 'chaser:UC1:v1', title: 'CHASER LIVE', body: 'A chaser went live.', at: 1 }

describe('notify bus', () => {
  it('delivers to subscribers and stops after unsubscribe', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeNotify(listener)
    emitNotify(event)
    expect(listener).toHaveBeenCalledWith(event)
    unsubscribe()
    emitNotify(event)
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
