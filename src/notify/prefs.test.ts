import { beforeEach, describe, expect, it } from 'vitest'
import type { NotifyEvent } from '../state/notify'
import {
  DEFAULT_PREFS,
  PREFS_KEY,
  SEEN_TTL_MS,
  eventRank,
  getPrefs,
  markSeen,
  parsePrefs,
  passesThreshold,
  pruneSeen,
  reloadPrefs,
  updatePrefs,
  type Threshold,
} from './prefs'

const NOW = Date.parse('2026-10-11T18:00:00Z')

const nws = (level: string): Pick<NotifyEvent, 'kind' | 'level'> => ({ kind: 'nws-alert', level })
const WATCH: Pick<NotifyEvent, 'kind' | 'level'> = { kind: 'spc-watch', level: 'TOA' }
const MD: Pick<NotifyEvent, 'kind' | 'level'> = { kind: 'spc-md', level: 'MD' }
const RISK: Pick<NotifyEvent, 'kind' | 'level'> = { kind: 'spc-risk', level: 'ENH' }
const CHASER: Pick<NotifyEvent, 'kind' | 'level'> = { kind: 'chaser-live' }

describe('passesThreshold', () => {
  const cases: [string, Pick<NotifyEvent, 'kind' | 'level'>, Threshold, boolean][] = [
    ['TOR under TOR', nws('TOR'), 'TOR', true],
    ['SVR under TOR', nws('SVR'), 'TOR', false],
    ['SVR under WARNINGS', nws('SVR'), 'WARNINGS', true],
    ['FFW under WARNINGS', nws('FFW'), 'WARNINGS', true],
    ['watch under WARNINGS', WATCH, 'WARNINGS', false],
    ['watch under WATCHES', WATCH, 'WATCHES', true],
    ['MD under WATCHES', MD, 'WATCHES', true],
    ['risk under WATCHES', RISK, 'WATCHES', false],
    ['risk under RISK', RISK, 'RISK', true],
    ['chaser under RISK', CHASER, 'RISK', false],
    ['chaser under CHASERS', CHASER, 'CHASERS', true],
    ['SPS never', nws('SPS'), 'CHASERS', false],
    ['OTHER never', nws('OTHER'), 'CHASERS', false],
  ]
  it.each(cases)('%s', (_name, event, threshold, expected) => {
    expect(passesThreshold(event, threshold)).toBe(expected)
  })

  it('ranks events on one scale', () => {
    expect([eventRank(nws('TOR')), eventRank(nws('SVR')), eventRank(WATCH), eventRank(RISK), eventRank(CHASER)]).toEqual([
      0, 1, 2, 3, 4,
    ])
    expect(eventRank(nws('SPS'))).toBe(-1)
  })
})

describe('parsePrefs', () => {
  it('gives the defaults for nothing stored', () => {
    expect(parsePrefs(null, NOW)).toEqual(DEFAULT_PREFS)
  })

  it('defaults to off with the WARNINGS step', () => {
    expect(DEFAULT_PREFS).toMatchObject({ enabled: false, threshold: 'WARNINGS', permission: 'default' })
  })

  it('gives the defaults for unreadable JSON', () => {
    expect(parsePrefs('{not json', NOW)).toEqual(DEFAULT_PREFS)
  })

  it('drops malformed fields and keeps good ones', () => {
    const raw = JSON.stringify({ enabled: 'yes', threshold: 'LOUD', permission: 'granted', seen: { a: NOW, b: 'x' } })
    expect(parsePrefs(raw, NOW)).toEqual({ enabled: false, threshold: 'WARNINGS', permission: 'granted', seen: { a: NOW } })
  })

  it('prunes seen keys older than 48 h when read', () => {
    const raw = JSON.stringify({ enabled: true, threshold: 'TOR', permission: 'default', seen: { old: NOW - SEEN_TTL_MS - 1, new: NOW } })
    expect(parsePrefs(raw, NOW).seen).toEqual({ new: NOW })
  })
})

describe('pruneSeen', () => {
  it('keeps keys inside the window and drops the rest', () => {
    expect(pruneSeen({ a: NOW - 1000, b: NOW - SEEN_TTL_MS }, NOW)).toEqual({ a: NOW - 1000 })
  })
})

describe('stored prefs', () => {
  beforeEach(() => {
    localStorage.clear()
    reloadPrefs()
  })

  it('writes updates to localStorage under the versioned key', () => {
    updatePrefs({ enabled: true, threshold: 'RISK' })
    expect(JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}')).toMatchObject({ enabled: true, threshold: 'RISK' })
    expect(getPrefs()).toMatchObject({ enabled: true, threshold: 'RISK' })
  })

  it('reads back what it wrote after a reload', () => {
    const handled = Date.now()
    updatePrefs({ threshold: 'CHASERS' })
    markSeen('K.1', handled)
    reloadPrefs()
    expect(getPrefs().threshold).toBe('CHASERS')
    expect(getPrefs().seen).toEqual({ 'K.1': handled })
  })

  it('still works when storage throws', () => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = () => {
      throw new Error('quota')
    }
    try {
      expect(() => updatePrefs({ enabled: true })).not.toThrow()
      expect(getPrefs().enabled).toBe(true)
    } finally {
      Storage.prototype.setItem = original
    }
  })
})
