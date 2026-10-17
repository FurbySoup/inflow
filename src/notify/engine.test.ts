import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NotifyEvent } from '../state/notify'
import { createEngine, getNotifyRuntime, resetNotifyRuntime, type EngineIo, type NoticeOptions } from './engine'
import { PREFS_KEY, getPrefs, reloadPrefs, updatePrefs, SEEN_TTL_MS } from './prefs'

const T0 = Date.parse('2026-10-11T18:00:00Z')

const event = (key: string, over: Partial<NotifyEvent> = {}): NotifyEvent => ({
  kind: 'nws-alert',
  key,
  title: `TORNADO WARNING · ${key}`,
  body: 'Bulloch, GA until 18:45Z.',
  at: Date.now(),
  level: 'TOR',
  ...over,
})

interface Fake {
  io: EngineIo
  opened: { title: string; options: NoticeOptions; close: ReturnType<typeof vi.fn> }[]
  setHidden(hidden: boolean): void
  setPermission(p: NotificationPermission | 'unsupported'): void
  setRefuse(refuse: boolean): void
}

function fakeIo(): Fake {
  const opened: Fake['opened'] = []
  const state = { hidden: true, permission: 'granted' as NotificationPermission | 'unsupported', refuse: false }
  const fake: Fake = {
    opened,
    io: {
      now: () => Date.now(),
      hidden: () => state.hidden,
      permission: () => state.permission,
      open: (title, options) => {
        if (state.refuse) throw new TypeError('Failed to construct Notification')
        const close = vi.fn()
        opened.push({ title, options, close })
        return { close }
      },
    },
    setHidden: (hidden) => {
      state.hidden = hidden
    },
    setPermission: (p) => {
      state.permission = p
    },
    setRefuse: (refuse) => {
      state.refuse = refuse
    },
  }
  return fake
}

describe('notify engine', () => {
  let fake: Fake

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(T0)
    localStorage.clear()
    reloadPrefs()
    updatePrefs({ enabled: true, threshold: 'WATCHES' })
    resetNotifyRuntime()
    fake = fakeIo()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does nothing while notifications are off', () => {
    updatePrefs({ enabled: false })
    const engine = createEngine(fake.io)
    engine.handle(event('K.off'))
    expect(getNotifyRuntime().count).toBe(0)
    expect(fake.opened).toHaveLength(0)
  })

  it('visible: no system notification, and the in-app count goes up', () => {
    fake.setHidden(false)
    const engine = createEngine(fake.io)
    engine.handle(event('K.vis'))
    expect(fake.opened).toHaveLength(0)
    expect(getNotifyRuntime().count).toBe(1)
  })

  it('hidden: a system notification tagged with the key', () => {
    const engine = createEngine(fake.io)
    engine.handle(event('K.hid'))
    expect(fake.opened).toHaveLength(1)
    expect(fake.opened[0].title).toBe('TORNADO WARNING · K.hid')
    expect(fake.opened[0].options).toMatchObject({ tag: 'K.hid', body: 'Bulloch, GA until 18:45Z.' })
    expect(fake.opened[0].options).not.toHaveProperty('renotify')
  })

  it('without permission while hidden, falls back to the in-app count', () => {
    fake.setPermission('default')
    const engine = createEngine(fake.io)
    engine.handle(event('K.nopermit'))
    expect(fake.opened).toHaveLength(0)
    expect(getNotifyRuntime().count).toBe(1)
  })

  it('a browser that refuses the constructor is marked unsupported and counts in-app', () => {
    fake.setRefuse(true)
    const engine = createEngine(fake.io)
    engine.handle(event('K.refuse'))
    expect(getNotifyRuntime()).toMatchObject({ count: 1, unsupported: true })
  })

  it('collapses overflow past the rate cap into one notification', () => {
    const engine = createEngine(fake.io)
    engine.handle(event('K.a'))
    engine.handle(event('K.b'))
    engine.handle(event('K.c'))
    expect(fake.opened).toHaveLength(1)
    vi.advanceTimersByTime(20_000)
    expect(fake.opened).toHaveLength(2)
    expect(fake.opened[1].title).toBe('2 MORE UPDATES')
    expect(fake.opened[1].options).toMatchObject({ body: 'Open INFLOW to see them.', tag: 'notify-overflow' })
  })

  it('allows at most 10 per hour and holds the eleventh until the hour rolls', () => {
    const engine = createEngine(fake.io)
    for (let i = 0; i < 10; i++) {
      engine.handle(event(`K.h${i}`))
      vi.advanceTimersByTime(20_000)
    }
    expect(fake.opened).toHaveLength(10)
    engine.handle(event('K.h10'))
    vi.advanceTimersByTime(3_399_999)
    expect(fake.opened).toHaveLength(10)
    vi.advanceTimersByTime(1)
    expect(fake.opened).toHaveLength(11)
    expect(fake.opened[10].options.tag).toBe('K.h10')
  })

  it('remembers handled keys, and prunes them after 48 h', () => {
    const engine = createEngine(fake.io)
    engine.handle(event('K.keep'))
    expect(getPrefs().seen['K.keep']).toBe(T0)
    expect(JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}').seen['K.keep']).toBe(T0)

    engine.handle(event('K.keep'))
    expect(fake.opened).toHaveLength(1)

    vi.setSystemTime(T0 + SEEN_TTL_MS + 1000)
    engine.handle(event('K.later'))
    expect(getPrefs().seen).not.toHaveProperty('K.keep')
    expect(getPrefs().seen).toHaveProperty('K.later')
  })

  it('filters by the threshold', () => {
    updatePrefs({ threshold: 'TOR' })
    const engine = createEngine(fake.io)
    engine.handle(event('K.svr', { level: 'SVR', title: 'SVR' }))
    engine.handle(event('K.watch', { kind: 'spc-watch', level: 'TOA', title: 'WATCH' }))
    expect(fake.opened).toHaveLength(0)
    engine.handle(event('K.tor'))
    expect(fake.opened).toHaveLength(1)
  })

  it('never notifies an event no threshold step includes', () => {
    const engine = createEngine(fake.io)
    engine.handle(event('K.sps', { level: 'SPS' }))
    expect(fake.opened).toHaveLength(0)
    expect(getNotifyRuntime().count).toBe(0)
  })

  it('closes its notices when the tab is visible again, and counts what was waiting', () => {
    const engine = createEngine(fake.io)
    engine.handle(event('K.one'))
    engine.handle(event('K.two'))
    engine.onVisible()
    expect(fake.opened[0].close).toHaveBeenCalledTimes(1)
    expect(getNotifyRuntime().count).toBe(1)
    vi.advanceTimersByTime(60_000)
    expect(fake.opened).toHaveLength(1)
  })

  describe('sendTest (ADR-0022)', () => {
    it('shows one test notice while visible, inside the rate window, and outside the threshold', () => {
      updatePrefs({ threshold: 'TOR' })
      const engine = createEngine(fake.io)
      // Use up the rate slot with a real TOR while hidden.
      engine.handle(event('K.a'))
      expect(fake.opened).toHaveLength(1)

      fake.setHidden(false)
      expect(engine.sendTest()).toBe('shown')
      expect(fake.opened).toHaveLength(2)
      expect(fake.opened[1].title).toBe('INFLOW TEST')
      expect(fake.opened[1].options.tag).toBe('notify-test')
      expect(getNotifyRuntime().count).toBe(0)
    })

    it('does not change the count, the seen keys or the rate slots', () => {
      const engine = createEngine(fake.io)
      const seenBefore = { ...getPrefs().seen }
      expect(engine.sendTest()).toBe('shown')
      expect(getNotifyRuntime().count).toBe(0)
      expect(getPrefs().seen).toEqual(seenBefore)
      // The rate slot is still free: a real event goes out straight away.
      engine.handle(event('K.after'))
      expect(fake.opened).toHaveLength(2)
      expect(fake.opened[1].title).toBe('TORNADO WARNING · K.after')
    })

    it('a refused constructor gives refused and marks the browser unsupported', () => {
      fake.setRefuse(true)
      const engine = createEngine(fake.io)
      expect(engine.sendTest()).toBe('refused')
      expect(getNotifyRuntime()).toMatchObject({ count: 0, unsupported: true })
    })

    it('without permission it is refused and the browser is not marked unsupported', () => {
      fake.setPermission('denied')
      const engine = createEngine(fake.io)
      expect(engine.sendTest()).toBe('refused')
      expect(fake.opened).toHaveLength(0)
      expect(getNotifyRuntime().unsupported).toBe(false)
    })
  })
})
