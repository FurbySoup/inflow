import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAoi } from '../state/aoi'
import { resetNotifyRuntime } from './engine'
import { NotifyControl } from './NotifyControl'
import {
  areaLine,
  BLOCKED,
  countLine,
  LIMITS,
  STATE_LINE,
  TEST_NOTIFICATION,
  TEST_RESULT,
  UNAVAILABLE,
} from './notifyCopy'
import { reloadPrefs, updatePrefs } from './prefs'

const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
const FIREFOX = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0'
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36'

const requestPermission = vi.fn<() => Promise<NotificationPermission>>()
const constructed: { title: string; options?: NotificationOptions }[] = []
let refuse = false

class FakeNotification {
  static permission: NotificationPermission = 'default'
  static requestPermission = requestPermission
  onclick: (() => void) | null = null
  constructor(title: string, options?: NotificationOptions) {
    if (refuse) throw new TypeError('Failed to construct Notification')
    constructed.push({ title, options })
  }
  close(): void {
    /* the fake has nothing on screen to close */
  }
}

const SETTINGS = { name: 'Send browser notifications' }

function setUserAgent(userAgent: string): void {
  vi.stubGlobal('navigator', { userAgent })
}

function fieldsetAbbrs(): string[] {
  return Array.from(document.querySelectorAll('.notify-fieldset abbr'), (a) => a.textContent ?? '')
}

describe('NotifyControl', () => {
  const initialStates = useAoi.getState().states

  beforeEach(() => {
    localStorage.clear()
    reloadPrefs()
    resetNotifyRuntime()
    requestPermission.mockReset()
    requestPermission.mockResolvedValue('granted')
    constructed.length = 0
    refuse = false
    vi.stubGlobal('Notification', FakeNotification)
    vi.stubGlobal('isSecureContext', true)
    setUserAgent(CHROME)
    FakeNotification.permission = 'default'
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    useAoi.setState({ states: initialStates })
  })

  it('asks for permission only from a click, never on mount', () => {
    render(<NotifyControl />)
    expect(requestPermission).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'NOTIFY OFF' }))
    fireEvent.click(screen.getByRole('checkbox', SETTINGS))

    expect(requestPermission).toHaveBeenCalledTimes(1)
  })

  it('turns on once the browser grants permission', async () => {
    render(<NotifyControl />)
    fireEvent.click(screen.getByRole('button', { name: 'NOTIFY OFF' }))
    await act(async () => {
      fireEvent.click(screen.getByRole('checkbox', SETTINGS))
    })
    expect(screen.getByRole('button', { name: 'NOTIFY ON' })).toBeTruthy()
  })

  it('names each state on the button', () => {
    render(<NotifyControl />)
    expect(screen.getByRole('button', { name: 'NOTIFY OFF' })).toBeTruthy()
    cleanup()

    updatePrefs({ enabled: true, permission: 'default' })
    render(<NotifyControl />)
    expect(screen.getByRole('button', { name: 'NOTIFY · ALLOW?' })).toBeTruthy()
    cleanup()

    FakeNotification.permission = 'granted'
    updatePrefs({ enabled: true, permission: 'granted' })
    render(<NotifyControl />)
    expect(screen.getByRole('button', { name: 'NOTIFY ON' })).toBeTruthy()
    cleanup()

    FakeNotification.permission = 'denied'
    updatePrefs({ enabled: true, permission: 'denied' })
    render(<NotifyControl />)
    expect(screen.getByRole('button', { name: 'NOTIFY BLOCKED' })).toBeTruthy()
    cleanup()

    updatePrefs({ enabled: true, permission: 'granted' })
    vi.stubGlobal('isSecureContext', false)
    render(<NotifyControl />)
    expect(screen.getByRole('button', { name: 'NOTIFY N/A' })).toBeTruthy()
  })

  it('gives the top-bar button its title', () => {
    render(<NotifyControl />)
    expect(screen.getByRole('button', { name: 'NOTIFY OFF' }).getAttribute('title')).toBe(
      'Browser notifications for warnings in the map view',
    )
  })

  it('shows the AOI states in the area line, first six then +N', () => {
    useAoi.setState({ states: ['TX', 'OK'] })
    render(<NotifyControl />)
    fireEvent.click(screen.getByRole('button', { name: 'NOTIFY OFF' }))
    expect(document.querySelector('.notify-area')?.textContent).toBe(areaLine('TX · OK'))
    cleanup()

    useAoi.setState({ states: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] })
    render(<NotifyControl />)
    fireEvent.click(screen.getByRole('button', { name: 'NOTIFY OFF' }))
    expect(document.querySelector('.notify-area')?.textContent).toBe(areaLine('A · B · C · D · E · F +2'))
  })

  it('shows ALLOW while pending, and the quiet-prompt hint after the timer', () => {
    vi.useFakeTimers()
    try {
      updatePrefs({ enabled: true })
      render(<NotifyControl />)
      fireEvent.click(screen.getByRole('button', { name: 'NOTIFY · ALLOW?' }))

      expect(screen.getByRole('button', { name: 'ALLOW NOTIFICATIONS' })).toBeTruthy()
      expect(screen.queryByText(STATE_LINE.pendingQuiet)).toBeNull()

      act(() => {
        vi.advanceTimersByTime(3000)
      })
      expect(screen.getByText(STATE_LINE.pendingQuiet)).toBeTruthy()
    } finally {
      vi.useRealTimers()
    }
  })

  it('offers SEND TEST once granted, and shows the result when pressed', () => {
    FakeNotification.permission = 'granted'
    updatePrefs({ enabled: true, permission: 'granted' })
    render(<NotifyControl />)
    fireEvent.click(screen.getByRole('button', { name: 'NOTIFY ON' }))

    fireEvent.click(screen.getByRole('button', { name: 'SEND TEST' }))

    expect(screen.getByText(TEST_RESULT.shown)).toBeTruthy()
    expect(constructed).toHaveLength(1)
    expect(constructed[0].title).toBe(TEST_NOTIFICATION.title)
    expect(constructed[0].options).toMatchObject({ tag: 'notify-test', body: TEST_NOTIFICATION.body })
    expect(screen.getByRole('button', { name: 'NOTIFY ON' })).toBeTruthy()
  })

  it('a throwing constructor shows the unavailable copy and N/A', () => {
    FakeNotification.permission = 'granted'
    updatePrefs({ enabled: true, permission: 'granted' })
    refuse = true
    render(<NotifyControl />)
    fireEvent.click(screen.getByRole('button', { name: 'NOTIFY ON' }))

    fireEvent.click(screen.getByRole('button', { name: 'SEND TEST' }))

    expect(screen.getByRole('button', { name: 'NOTIFY N/A' })).toBeTruthy()
    expect(screen.getByText(UNAVAILABLE.other)).toBeTruthy()
    expect(screen.getByText(TEST_RESULT.refused)).toBeTruthy()
  })

  it('Android is unavailable up front, even with the API present', () => {
    setUserAgent(ANDROID)
    FakeNotification.permission = 'granted'
    updatePrefs({ enabled: true, permission: 'granted' })
    render(<NotifyControl />)
    fireEvent.click(screen.getByRole('button', { name: 'NOTIFY N/A' }))
    expect(screen.getByText(UNAVAILABLE.android)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'SEND TEST' })).toBeNull()
  })

  it('blocked shows the Chromium path for a Chrome UA', () => {
    FakeNotification.permission = 'denied'
    updatePrefs({ enabled: true, permission: 'denied' })
    render(<NotifyControl />)
    fireEvent.click(screen.getByRole('button', { name: 'NOTIFY BLOCKED' }))

    expect(screen.getByText(BLOCKED.head)).toBeTruthy()
    expect(screen.getByText(BLOCKED.chromium)).toBeTruthy()
    expect(screen.getByText(BLOCKED.stuck)).toBeTruthy()
    expect(requestPermission).not.toHaveBeenCalled()
  })

  it('blocked shows the Firefox path for a Firefox UA', () => {
    setUserAgent(FIREFOX)
    FakeNotification.permission = 'denied'
    updatePrefs({ enabled: true, permission: 'denied' })
    render(<NotifyControl />)
    fireEvent.click(screen.getByRole('button', { name: 'NOTIFY BLOCKED' }))

    expect(screen.getByText(BLOCKED.firefox)).toBeTruthy()
    expect(screen.queryByText(BLOCKED.chromium)).toBeNull()
    expect(screen.getByText(BLOCKED.stuck)).toBeTruthy()
  })

  it('an insecure page shows the reason with the box unticked', () => {
    vi.stubGlobal('isSecureContext', false)
    render(<NotifyControl />)
    fireEvent.click(screen.getByRole('button', { name: 'NOTIFY N/A' }))

    expect(screen.getByText(UNAVAILABLE.insecure)).toBeTruthy()
    expect(screen.getByRole('checkbox', SETTINGS)).toHaveProperty('checked', false)
  })

  it('always shows the limits', () => {
    render(<NotifyControl />)
    fireEvent.click(screen.getByRole('button', { name: 'NOTIFY OFF' }))
    expect(screen.getByText(LIMITS)).toBeTruthy()
    cleanup()

    FakeNotification.permission = 'granted'
    updatePrefs({ enabled: true, permission: 'granted' })
    render(<NotifyControl />)
    fireEvent.click(screen.getByRole('button', { name: 'NOTIFY ON' }))
    expect(screen.getByText(LIMITS)).toBeTruthy()
  })

  it('defaults the threshold to WARNINGS for fresh prefs', () => {
    render(<NotifyControl />)
    fireEvent.click(screen.getByRole('button', { name: 'NOTIFY OFF' }))
    expect(document.querySelector<HTMLInputElement>('input[value="WARNINGS"]')?.checked).toBe(true)
    expect(document.querySelector<HTMLInputElement>('input[value="WATCHES"]')?.checked).toBe(false)
  })

  it('shows SPC in an option as an abbreviation', () => {
    render(<NotifyControl />)
    fireEvent.click(screen.getByRole('button', { name: 'NOTIFY OFF' }))
    expect(fieldsetAbbrs()).toContain('SPC')
  })

  it('shows the in-app count in the popover', () => {
    FakeNotification.permission = 'granted'
    updatePrefs({ enabled: true, permission: 'granted' })
    render(<NotifyControl />)
    fireEvent.click(screen.getByRole('button', { name: 'NOTIFY ON' }))
    expect(document.querySelector('.notify-count')?.textContent).toBe(countLine(0))
  })

  it('re-reads the browser permission when the popover opens', () => {
    FakeNotification.permission = 'denied'
    updatePrefs({ enabled: true })
    render(<NotifyControl />)
    expect(screen.getByRole('button', { name: 'NOTIFY BLOCKED' })).toBeTruthy()

    FakeNotification.permission = 'granted'
    fireEvent.click(screen.getByRole('button', { name: 'NOTIFY BLOCKED' }))

    expect(screen.getByRole('button', { name: 'NOTIFY ON' })).toBeTruthy()
    expect(screen.queryByText(BLOCKED.head)).toBeNull()
    expect(requestPermission).not.toHaveBeenCalled()
  })

  it('re-reads the browser permission when the tab becomes visible', () => {
    const visibility = Object.getOwnPropertyDescriptor(document, 'visibilityState')
    try {
      FakeNotification.permission = 'denied'
      updatePrefs({ enabled: true })
      render(<NotifyControl />)
      expect(screen.getByRole('button', { name: 'NOTIFY BLOCKED' })).toBeTruthy()

      FakeNotification.permission = 'granted'
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'))
      })

      expect(screen.getByRole('button', { name: 'NOTIFY ON' })).toBeTruthy()
      expect(requestPermission).not.toHaveBeenCalled()
    } finally {
      if (visibility) Object.defineProperty(document, 'visibilityState', visibility)
      else delete (document as { visibilityState?: unknown }).visibilityState
    }
  })

  it('closes on Escape and returns focus to the button', () => {
    render(<NotifyControl />)
    const button = screen.getByRole('button', { name: 'NOTIFY OFF' })
    fireEvent.click(button)
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(button)
  })
})
