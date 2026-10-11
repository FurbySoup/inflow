import { useEffect, useRef, useSyncExternalStore } from 'react'
import { useAoi } from '../state/aoi'
import { useLayout } from '../state/layout'
import { useStreams } from '../state/streams'
import { toggleLayer } from '../map/LayerControl'
import { ConsoleButton } from '../ui'
import { AOI_PRESETS } from './aoiPresetData'
import { HelpDialog } from './help/HelpDialog'
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

// Roving-tabindex tabs (tabindex=-1) are not tab stops, so they are left out of the trap too.
const FOCUSABLE =
  'button:not([disabled]):not([tabindex="-1"]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

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

/**
 * Top-bar button that opens the help: keyboard shortcuts, the acronym glossary and chaser terms. Shown on touch screens too,
 * because the glossary is the only way to read an acronym's meaning without a mouse-over tip (ADR-0018).
 */
export function KeysButton() {
  const open = useHelpOpen()
  return (
    // No aria-label: the visible "? HELP" is the accessible name (WCAG 2.5.3 label in name); the title describes it.
    <ConsoleButton
      aria-expanded={open}
      title="Help: keyboard shortcuts, glossary and chaser terms (?)"
      onClick={() => setHelpOpen(!helpOpen)}
    >
      ? HELP
    </ConsoleButton>
  )
}

/** Global keydown handler and the `?` help overlay (HelpDialog). Mount once; the top-bar entry point is KeysButton. */
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
      // Esc closes the help even while the search box has focus (a typing target, so it is handled before that guard).
      if (helpOpen && e.key === 'Escape') {
        setHelpOpen(false)
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

  return <HelpDialog dialogRef={dialogRef} onClose={() => setHelpOpen(false)} />
}
