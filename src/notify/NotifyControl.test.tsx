import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetNotifyRuntime } from './engine'
import { NotifyControl } from './NotifyControl'
import { reloadPrefs, updatePrefs } from './prefs'

const requestPermission = vi.fn<() => Promise<NotificationPermission>>()

class FakeNotification {
  static permission: NotificationPermission = 'default'
  static requestPermission = requestPermission
}

describe('NotifyControl', () => {
  beforeEach(() => {
    localStorage.clear()
    reloadPrefs()
    resetNotifyRuntime()
    requestPermission.mockReset()
    requestPermission.mockResolvedValue('granted')
    vi.stubGlobal('Notification', FakeNotification)
    FakeNotification.permission = 'default'
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('asks for permission only from a click, never on mount', () => {
    render(<NotifyControl />)
    expect(requestPermission).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'NOTIFY OFF' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Notify me while this tab is open' }))

    expect(requestPermission).toHaveBeenCalledTimes(1)
  })

  it('turns on once the browser grants permission', async () => {
    render(<NotifyControl />)
    fireEvent.click(screen.getByRole('button', { name: 'NOTIFY OFF' }))
    await act(async () => {
      fireEvent.click(screen.getByRole('checkbox', { name: 'Notify me while this tab is open' }))
    })
    expect(screen.getByRole('button', { name: 'NOTIFY ON' })).toBeTruthy()
  })

  it('shows the blocked state and does not ask again', () => {
    FakeNotification.permission = 'denied'
    updatePrefs({ enabled: true, permission: 'denied' })
    render(<NotifyControl />)

    expect(screen.getByRole('button', { name: 'NOTIFY BLOCKED' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'NOTIFY BLOCKED' }))
    expect(screen.getByText(/BLOCKED IN BROWSER/)).toBeTruthy()
    expect(requestPermission).not.toHaveBeenCalled()
  })

  it('shows the in-app count in the popover and clears it when closed', () => {
    FakeNotification.permission = 'granted'
    updatePrefs({ enabled: true, permission: 'granted' })
    render(<NotifyControl />)
    fireEvent.click(screen.getByRole('button', { name: 'NOTIFY ON' }))
    expect(document.querySelector('.notify-count')?.textContent).toBe('0 NEW')
    expect(screen.getByText(/Works only while this tab is open/)).toBeTruthy()
  })

  it('re-reads the browser permission when the popover opens', () => {
    FakeNotification.permission = 'denied'
    updatePrefs({ enabled: true })
    render(<NotifyControl />)
    expect(screen.getByRole('button', { name: 'NOTIFY BLOCKED' })).toBeTruthy()

    FakeNotification.permission = 'granted'
    fireEvent.click(screen.getByRole('button', { name: 'NOTIFY BLOCKED' }))

    expect(screen.getByRole('button', { name: 'NOTIFY ON' })).toBeTruthy()
    expect(screen.queryByText(/BLOCKED IN BROWSER/)).toBeNull()
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
