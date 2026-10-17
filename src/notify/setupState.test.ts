import { describe, expect, it } from 'vitest'
import { browserFamily, setupState, unavailableReason, type SetupInput } from './setupState'

const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
const FIREFOX = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0'
const SAFARI = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36'

describe('unavailableReason', () => {
  it('is null on a secure desktop page with the API', () => {
    expect(unavailableReason({ hasApi: true, secure: true, userAgent: CHROME })).toBeNull()
  })

  it('is insecure for a page that is not a secure context, whatever else is true', () => {
    expect(unavailableReason({ hasApi: true, secure: false, userAgent: CHROME })).toBe('insecure')
    expect(unavailableReason({ hasApi: false, secure: false, userAgent: IPHONE })).toBe('insecure')
  })

  it('names insecure before android, even with the API present', () => {
    expect(unavailableReason({ hasApi: true, secure: false, userAgent: ANDROID })).toBe('insecure')
  })

  it('is ios on iPhone and iPad without the API', () => {
    expect(unavailableReason({ hasApi: false, secure: true, userAgent: IPHONE })).toBe('ios')
    expect(
      unavailableReason({ hasApi: false, secure: true, userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)' }),
    ).toBe('ios')
  })

  it('is android on Android even when the API exists', () => {
    expect(unavailableReason({ hasApi: true, secure: true, userAgent: ANDROID })).toBe('android')
    expect(unavailableReason({ hasApi: false, secure: true, userAgent: ANDROID })).toBe('android')
  })

  it('is other when there is no API on a desktop browser', () => {
    expect(unavailableReason({ hasApi: false, secure: true, userAgent: CHROME })).toBe('other')
  })
})

describe('setupState', () => {
  const base: SetupInput = { enabled: true, permission: 'granted', reason: null, pending: false }

  it.each<[string, Partial<SetupInput>, ReturnType<typeof setupState>]>([
    ['granted and ticked is on', {}, 'on'],
    ['unticked is off', { enabled: false }, 'off'],
    ['unticked with denied is still off', { enabled: false, permission: 'denied' }, 'off'],
    ['ticked and denied is blocked', { permission: 'denied' }, 'blocked'],
    ['ticked and undecided is pending', { permission: 'default' }, 'pending'],
    ['pending stays pending while in flight', { permission: 'default', pending: true }, 'pending'],
    ['unticked with a reason is unavailable', { enabled: false, reason: 'insecure' }, 'unavailable'],
    ['ticked with a reason is unavailable', { reason: 'android' }, 'unavailable'],
    ['a reason beats denied', { permission: 'denied', reason: 'other' }, 'unavailable'],
    ['a reason beats granted', { reason: 'ios' }, 'unavailable'],
  ])('%s', (_name, over, expected) => {
    expect(setupState({ ...base, ...over })).toBe(expected)
  })

  it('covers every enabled, permission and reason combination', () => {
    const reasons = [null, 'insecure', 'ios', 'android', 'other'] as const
    const permissions = ['granted', 'denied', 'default'] as const
    for (const enabled of [true, false])
      for (const permission of permissions)
        for (const reason of reasons) {
          const got = setupState({ enabled, permission, reason, pending: false })
          const want =
            reason !== null
              ? 'unavailable'
              : !enabled
                ? 'off'
                : permission === 'denied'
                  ? 'blocked'
                  : permission === 'granted'
                    ? 'on'
                    : 'pending'
          expect(got, `${enabled}/${permission}/${reason}`).toBe(want)
        }
  })
})

describe('browserFamily', () => {
  it('names Firefox, Safari and Chromium browsers', () => {
    expect(browserFamily(FIREFOX)).toBe('firefox')
    expect(browserFamily(SAFARI)).toBe('safari')
    expect(browserFamily(CHROME)).toBe('chromium')
  })

  it('treats Chrome-based and Android browsers as chromium, not Safari', () => {
    expect(browserFamily(ANDROID)).toBe('chromium')
    expect(browserFamily('Mozilla/5.0 Edg/130.0 Safari/537.36')).toBe('chromium')
    expect(browserFamily('Mozilla/5.0 (iPhone) CriOS/130.0 Mobile/15E148 Safari/604.1')).toBe('chromium')
  })
})
