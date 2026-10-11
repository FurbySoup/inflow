import type { PresetName } from '../state/layout'

// Pure keymap (WP-17): key event in, action out. KeyboardShortcuts.tsx performs the action.

/** The part of a KeyboardEvent the keymap reads. */
export interface KeyLike {
  key: string
  code: string
  shiftKey: boolean
  ctrlKey: boolean
  altKey: boolean
  metaKey: boolean
  repeat: boolean
}

export type ShortcutAction =
  | { type: 'cycle-primary'; dir: 1 | -1 }
  /** Index into AOI_PRESETS (0 = plains, 1 = dixie, 2 = southeast). */
  | { type: 'aoi-preset'; index: number }
  | { type: 'layout-preset'; name: PresetName }
  | { type: 'toggle-layers'; ids: readonly string[] }
  | { type: 'fullscreen' }
  | { type: 'toggle-help' }
  | { type: 'close-help' }

/** Layer toggles by letter. W drives both watch outline layers (WP-17 prep contract). */
export const LAYER_KEYS: Readonly<Record<string, readonly string[]>> = {
  r: ['radar'],
  v: ['velocity'],
  s: ['satellite'],
  w: ['watch-outlines', 'spc-watch'],
}

const LAYOUT_BY_DIGIT: Readonly<Record<number, PresetName>> = { 1: 'DEFAULT', 2: 'WALL', 3: 'CHASE' }

/**
 * The digit a key stands for, read from `code` first: with Shift held a US layout reports `!` as
 * `key`, so `code` is what tells Shift+1 apart from 1. Falls back to `key` for layouts without codes.
 */
function digitOf(input: KeyLike): number | null {
  const fromCode = /^(?:Digit|Numpad)([1-3])$/.exec(input.code)
  if (fromCode) return Number(fromCode[1])
  if (input.key === '1' || input.key === '2' || input.key === '3') return Number(input.key)
  return null
}

/**
 * Resolves a keydown to a shortcut, or null when the key does nothing here. Ctrl, Alt and Meta
 * combinations always return null so browser and OS shortcuts keep working. Auto-repeat only
 * fires for the primary-stream cycle, so holding a key does not flicker fullscreen or the help.
 * Does not check where focus is: the caller applies the typing guard (isTypingTarget).
 * While the help overlay is open only `?` and Escape act, so nothing changes behind the backdrop.
 */
export function resolveShortcut(input: KeyLike, opts: { helpOpen?: boolean } = {}): ShortcutAction | null {
  if (input.ctrlKey || input.altKey || input.metaKey) return null

  if (opts.helpOpen) {
    if (input.repeat) return null
    if (input.key === '?') return { type: 'toggle-help' }
    if (input.key === 'Escape') return { type: 'close-help' }
    return null
  }

  const digit = digitOf(input)
  if (digit !== null) {
    if (input.repeat) return null
    return input.shiftKey
      ? { type: 'layout-preset', name: LAYOUT_BY_DIGIT[digit] as PresetName }
      : { type: 'aoi-preset', index: digit - 1 }
  }

  if (input.key === '[' || input.key === ']') {
    return { type: 'cycle-primary', dir: input.key === ']' ? 1 : -1 }
  }
  if (input.repeat) return null

  if (input.key === '?') return { type: 'toggle-help' }
  if (input.key === 'Escape') return { type: 'close-help' }

  const letter = input.key.toLowerCase()
  if (letter === 'f') return { type: 'fullscreen' }
  const ids = LAYER_KEYS[letter]
  if (ids) return { type: 'toggle-layers', ids }

  return null
}

/** The focus fields the typing guard reads (an HTMLElement satisfies this). */
export interface FocusLike {
  tagName: string
  isContentEditable: boolean
}

/** True when keys are text for this element (input, select, textarea, contenteditable), so shortcuts must not fire. */
export function isTypingTarget(el: FocusLike | null): boolean {
  if (!el) return false
  if (el.isContentEditable) return true
  return ['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName.toUpperCase())
}
