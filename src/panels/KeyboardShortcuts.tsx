import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useAoi } from '../state/aoi'
import { useLayout } from '../state/layout'
import { useStreams } from '../state/streams'
import { toggleLayer } from '../map/LayerControl'
import { ConsoleButton, Panel } from '../ui'
import { AOI_PRESETS } from './aoiPresetData'
import { isTypingTarget, resolveShortcut, type ShortcutAction } from './shortcuts'

// Wall-display keyboard control (WP-17). Mounted once; the keymap itself is pure (shortcuts.ts).
// Keys do not reach the page while a YouTube iframe has focus (the browser keeps them): the help says so.

function toggleFullscreen(): void {
  if (document.fullscreenElement) {
    void document.exitFullscreen().catch(() => undefined)
  } else {
    void document.documentElement.requestFullscreen().catch(() => undefined)
  }
}

function perform(action: ShortcutAction, setHelp: (update: (open: boolean) => boolean) => void): void {
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
      setHelp((open) => !open)
      return
    case 'close-help':
      setHelp(() => false)
      return
  }
}

// Touch-only devices get no key hints (ADR-0014): nothing advertises keys they cannot press.
function hasFinePointer(): boolean {
  return typeof window.matchMedia !== 'function' || !window.matchMedia('(pointer: coarse)').matches
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

/** Keyboard shortcuts: global keydown handler, a "KEYS" hint button and the `?` help overlay. */
export function KeyboardShortcuts() {
  const [helpOpen, setHelpOpen] = useState(false)
  const [showHint] = useState(hasFinePointer)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return
      if (isTypingTarget(e.target instanceof HTMLElement ? e.target : null)) return
      const action = resolveShortcut(e)
      if (action) perform(action, setHelpOpen)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Moves focus into the dialog (its first button is the header close) so keyboard users land on it.
  useEffect(() => {
    if (helpOpen) dialogRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
  }, [helpOpen])

  return (
    <>
      {showHint && (
        <ConsoleButton
          aria-label="Keyboard shortcuts"
          aria-expanded={helpOpen}
          title="Keyboard shortcuts (?)"
          onClick={() => setHelpOpen((open) => !open)}
          style={{ position: 'fixed', right: 8, bottom: 8, zIndex: 900, background: 'var(--panel)' }}
        >
          ? KEYS
        </ConsoleButton>
      )}
      {helpOpen && (
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
              status="live"
              meta={
                <ConsoleButton aria-label="Close keyboard shortcuts" onClick={() => setHelpOpen(false)}>
                  ESC
                </ConsoleButton>
              }
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '8px 16px', padding: 12, alignItems: 'center' }}>
                {ROWS.map((row) => (
                  <div key={row.keys.join(' ')} style={{ display: 'contents' }}>
                    <span style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {row.keys.map((k) => (
                        <kbd key={k} style={KEY_CAP}>
                          {k}
                        </kbd>
                      ))}
                    </span>
                    <span>{row.label}</span>
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
      )}
    </>
  )
}
