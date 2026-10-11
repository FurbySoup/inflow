import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react'
import { useAoi } from '../state/aoi'
import { useLayout } from '../state/layout'
import { useStreams } from '../state/streams'
import { toggleLayer } from '../map/LayerControl'
import { ConsoleButton, Panel } from '../ui'
import { AOI_PRESETS } from './aoiPresetData'
import { isTypingTarget, resolveShortcut, type ShortcutAction } from './shortcuts'

// Wall-display keyboard control (WP-17). The keymap itself is pure (shortcuts.ts). KeyboardShortcuts is
// mounted once and handles keys; KeysButton sits in the top bar and opens the same help overlay.
// Keys do not reach the page while a YouTube iframe has focus (the browser keeps them): the help says so.

// Help-overlay open state, module-level so the top-bar button and the overlay share it without a store.
let helpOpen = false
const helpListeners = new Set<() => void>()

function setHelpOpen(next: boolean): void {
  if (next === helpOpen) return
  helpOpen = next
  for (const listener of helpListeners) listener()
}

function subscribeHelp(listener: () => void): () => void {
  helpListeners.add(listener)
  return () => {
    helpListeners.delete(listener)
  }
}

function useHelpOpen(): boolean {
  return useSyncExternalStore(subscribeHelp, () => helpOpen)
}

function toggleFullscreen(): void {
  // iOS Safari and older WebKit have no Fullscreen API: do nothing rather than throw from the keydown handler.
  if (document.fullscreenElement) {
    if (typeof document.exitFullscreen === 'function') void document.exitFullscreen().catch(() => undefined)
    return
  }
  if (typeof document.documentElement.requestFullscreen === 'function') {
    void document.documentElement.requestFullscreen().catch(() => undefined)
  }
}

function perform(action: ShortcutAction): void {
  switch (action.type) {
    case 'cycle-primary':
      useStreams.getState().cyclePrimary(action.dir)
      return
    case 'aoi-preset': {
      const preset = AOI_PRESETS[action.index]
      if (preset) useAoi.getState().requestAoi(preset.bbox)
      return
    }
    case 'layout-preset':
      useLayout.getState().applyPreset(action.name)
      return
    case 'toggle-layers':
      for (const id of action.ids) toggleLayer(id)
      return
    case 'fullscreen':
      toggleFullscreen()
      return
    case 'toggle-help':
      setHelpOpen(!helpOpen)
      return
    case 'close-help':
      setHelpOpen(false)
      return
  }
}

const FOCUSABLE =
  'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** Keeps Tab and Shift+Tab cycling inside the open dialog (it is aria-modal). */
function trapTab(e: KeyboardEvent, dialog: HTMLElement | null): void {
  if (!dialog) return
  const items = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE))
  const first = items[0]
  const last = items[items.length - 1]
  if (!first || !last) {
    e.preventDefault()
    return
  }
  const active = document.activeElement
  const inside = active instanceof Node && dialog.contains(active)
  if (e.shiftKey) {
    if (!inside || active === first) {
      e.preventDefault()
      last.focus()
    }
  } else if (!inside || active === last) {
    e.preventDefault()
    first.focus()
  }
}

// Touch-only devices get no key hints (ADR-0014): nothing advertises keys they cannot press.
function hasFinePointer(): boolean {
  return typeof window.matchMedia !== 'function' || !window.matchMedia('(pointer: coarse)').matches
}

/** Top-bar button that opens the keyboard help. Hidden on touch-only devices. */
export function KeysButton() {
  const open = useHelpOpen()
  const [showButton] = useState(hasFinePointer)
  if (!showButton) return null
  return (
    // No aria-label: the visible "? KEYS" is the accessible name (WCAG 2.5.3 label in name); the title describes it.
    <ConsoleButton
      aria-expanded={open}
      title="Keyboard shortcuts (?)"
      onClick={() => setHelpOpen(!helpOpen)}
    >
      ? KEYS
    </ConsoleButton>
  )
}

const KEY_CAP: CSSProperties = {
  fontFamily: 'var(--font-data)',
  color: 'var(--accent)',
  border: '1px solid var(--border)',
  background: 'var(--panel-head)',
  padding: '0 6px',
  minWidth: '2em',
  textAlign: 'center',
  whiteSpace: 'nowrap',
}

const ROWS: readonly { keys: readonly string[]; label: ReactNode }[] = [
  { keys: ['[', ']'], label: 'Previous / next primary stream' },
  { keys: ['1', '2', '3'], label: 'AOI preset: Plains, Dixie Alley, Southeast' },
  { keys: ['Shift+1', 'Shift+2', 'Shift+3'], label: 'Layout preset: DEFAULT, WALL, CHASE' },
  { keys: ['R'], label: 'Toggle radar' },
  { keys: ['S'], label: 'Toggle satellite' },
  { keys: ['W'], label: 'Toggle watch outlines (SPC and NWS)' },
  { keys: ['F'], label: 'Toggle fullscreen' },
  { keys: ['?'], label: 'Show or hide this help' },
  { keys: ['Esc'], label: 'Close this help' },
]

/** Global keydown handler and the `?` help overlay. Mount once; the top-bar entry point is KeysButton. */
export function KeyboardShortcuts() {
  const open = useHelpOpen()
  const dialogRef = useRef<HTMLDivElement>(null)
  // The element that had focus before the help opened, so closing returns the keyboard user there.
  const returnFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return
      if (helpOpen && e.key === 'Tab') {
        trapTab(e, dialogRef.current)
        return
      }
      if (isTypingTarget(e.target instanceof HTMLElement ? e.target : null)) return
      const action = resolveShortcut(e, { helpOpen })
      if (action) perform(action)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Opening moves focus into the dialog (its first button is the header close). Closing, by any
  // path, returns focus to whatever had it before.
  useEffect(() => {
    if (open) {
      returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      dialogRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
    } else if (returnFocusRef.current) {
      returnFocusRef.current.focus()
      returnFocusRef.current = null
    }
  }, [open])

  if (!open) return null

  // Status is a grey LED: this panel is not a feed, so no live/error state applies.
  return (
    <div
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setHelpOpen(false)
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        background: 'color-mix(in srgb, var(--bg) 85%, transparent)',
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        style={{ width: 'min(44rem, 100%)', maxHeight: '100%', overflow: 'auto' }}
      >
        <Panel
          code="KBD-01"
          title="Keyboard shortcuts"
          status="offline"
          meta={
            <ConsoleButton aria-label="Close keyboard shortcuts" onClick={() => setHelpOpen(false)}>
              ESC
            </ConsoleButton>
          }
        >
          {/* Each row wraps: on a phone the description drops under its keys instead of a one-word column (ADR-0014). */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 12 }}>
            {ROWS.map((row) => (
              <div key={row.keys.join(' ')} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px 16px' }}>
                <span style={{ display: 'flex', gap: 4, flexWrap: 'wrap', minWidth: '13em' }}>
                  {row.keys.map((k) => (
                    <kbd key={k} style={KEY_CAP}>
                      {k}
                    </kbd>
                  ))}
                </span>
                <span style={{ flex: '1 1 14em' }}>{row.label}</span>
              </div>
            ))}
          </div>
          <p style={{ margin: 0, padding: '0 12px 12px', color: 'var(--muted)', fontSize: '0.8rem' }}>
            Keys are ignored while typing in a field. A focused YouTube player keeps the keyboard for itself:
            click elsewhere on the page first.
          </p>
        </Panel>
      </div>
    </div>
  )
}
