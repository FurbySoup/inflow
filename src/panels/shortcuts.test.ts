import { describe, expect, it } from 'vitest'
import { isTypingTarget, resolveShortcut, type KeyLike } from './shortcuts'

const key = (over: Partial<KeyLike> & { key: string }): KeyLike => ({
  code: '',
  shiftKey: false,
  ctrlKey: false,
  altKey: false,
  metaKey: false,
  repeat: false,
  ...over,
})

describe('resolveShortcut', () => {
  it('cycles the primary stream with [ and ]', () => {
    expect(resolveShortcut(key({ key: ']' }))).toEqual({ type: 'cycle-primary', dir: 1 })
    expect(resolveShortcut(key({ key: '[' }))).toEqual({ type: 'cycle-primary', dir: -1 })
    expect(resolveShortcut(key({ key: ']', repeat: true }))).toEqual({ type: 'cycle-primary', dir: 1 })
  })

  it('applies AOI presets on 1 to 3', () => {
    expect(resolveShortcut(key({ key: '1', code: 'Digit1' }))).toEqual({ type: 'aoi-preset', index: 0 })
    expect(resolveShortcut(key({ key: '2', code: 'Digit2' }))).toEqual({ type: 'aoi-preset', index: 1 })
    expect(resolveShortcut(key({ key: '3', code: 'Digit3' }))).toEqual({ type: 'aoi-preset', index: 2 })
  })

  it('reads digits from the physical code, so Shift+1 is a layout and not 1', () => {
    expect(resolveShortcut(key({ key: '!', code: 'Digit1', shiftKey: true }))).toEqual({
      type: 'layout-preset',
      name: 'DEFAULT',
    })
    expect(resolveShortcut(key({ key: '@', code: 'Digit2', shiftKey: true }))).toEqual({
      type: 'layout-preset',
      name: 'WALL',
    })
    expect(resolveShortcut(key({ key: '#', code: 'Digit3', shiftKey: true }))).toEqual({
      type: 'layout-preset',
      name: 'CHASE',
    })
  })

  it('falls back to key for digits when there is no code, and accepts numpad digits', () => {
    expect(resolveShortcut(key({ key: '2' }))).toEqual({ type: 'aoi-preset', index: 1 })
    expect(resolveShortcut(key({ key: '1', code: 'Numpad1' }))).toEqual({ type: 'aoi-preset', index: 0 })
    expect(resolveShortcut(key({ key: '1', code: 'Numpad1', shiftKey: true }))).toEqual({
      type: 'layout-preset',
      name: 'DEFAULT',
    })
  })

  it('ignores digits outside 1 to 3 and digits on auto-repeat', () => {
    expect(resolveShortcut(key({ key: '4', code: 'Digit4' }))).toBeNull()
    expect(resolveShortcut(key({ key: '1', code: 'Digit1', repeat: true }))).toBeNull()
  })

  it('toggles layers: R radar, S satellite, W both watch outlines', () => {
    expect(resolveShortcut(key({ key: 'r' }))).toEqual({ type: 'toggle-layers', ids: ['radar'] })
    expect(resolveShortcut(key({ key: 'S' }))).toEqual({ type: 'toggle-layers', ids: ['satellite'] })
    expect(resolveShortcut(key({ key: 'w' }))).toEqual({
      type: 'toggle-layers',
      ids: ['watch-outlines', 'spc-watch'],
    })
  })

  it('maps F to fullscreen and ? and Escape to the help overlay', () => {
    expect(resolveShortcut(key({ key: 'f' }))).toEqual({ type: 'fullscreen' })
    expect(resolveShortcut(key({ key: '?', shiftKey: true }))).toEqual({ type: 'toggle-help' })
    expect(resolveShortcut(key({ key: 'Escape' }))).toEqual({ type: 'close-help' })
  })

  it('does not repeat toggles while a key is held', () => {
    expect(resolveShortcut(key({ key: 'f', repeat: true }))).toBeNull()
    expect(resolveShortcut(key({ key: 'w', repeat: true }))).toBeNull()
    expect(resolveShortcut(key({ key: '?', repeat: true }))).toBeNull()
  })

  it('ignores Ctrl, Alt and Meta combinations so browser shortcuts still work', () => {
    expect(resolveShortcut(key({ key: 'r', ctrlKey: true }))).toBeNull()
    expect(resolveShortcut(key({ key: 'f', ctrlKey: true }))).toBeNull()
    expect(resolveShortcut(key({ key: '1', code: 'Digit1', altKey: true }))).toBeNull()
    expect(resolveShortcut(key({ key: ']', metaKey: true }))).toBeNull()
    expect(resolveShortcut(key({ key: '!', code: 'Digit1', shiftKey: true, ctrlKey: true }))).toBeNull()
  })

  it('while the help is open, only ? and Escape act', () => {
    const open = { helpOpen: true }
    expect(resolveShortcut(key({ key: '?' }), open)).toEqual({ type: 'toggle-help' })
    expect(resolveShortcut(key({ key: 'Escape' }), open)).toEqual({ type: 'close-help' })
    expect(resolveShortcut(key({ key: '[' }), open)).toBeNull()
    expect(resolveShortcut(key({ key: ']' }), open)).toBeNull()
    expect(resolveShortcut(key({ key: 'w' }), open)).toBeNull()
    expect(resolveShortcut(key({ key: 'f' }), open)).toBeNull()
    expect(resolveShortcut(key({ key: '2', code: 'Digit2' }), open)).toBeNull()
    expect(resolveShortcut(key({ key: '!', code: 'Digit1', shiftKey: true }), open)).toBeNull()
  })

  it('with the help closed, layer keys work and Escape still resolves (the panel no-ops it)', () => {
    expect(resolveShortcut(key({ key: 'w' }), { helpOpen: false })).toEqual({
      type: 'toggle-layers',
      ids: ['watch-outlines', 'spc-watch'],
    })
    expect(resolveShortcut(key({ key: 'Escape' }))).toEqual({ type: 'close-help' })
  })

  it('returns null for unmapped keys', () => {
    expect(resolveShortcut(key({ key: 'x' }))).toBeNull()
    expect(resolveShortcut(key({ key: 'Enter' }))).toBeNull()
  })
})

describe('isTypingTarget', () => {
  it('guards text fields and contenteditable', () => {
    expect(isTypingTarget({ tagName: 'INPUT', isContentEditable: false })).toBe(true)
    expect(isTypingTarget({ tagName: 'TEXTAREA', isContentEditable: false })).toBe(true)
    expect(isTypingTarget({ tagName: 'SELECT', isContentEditable: false })).toBe(true)
    expect(isTypingTarget({ tagName: 'DIV', isContentEditable: true })).toBe(true)
  })

  it('lets keys through on buttons, the body and nothing focused', () => {
    expect(isTypingTarget({ tagName: 'BUTTON', isContentEditable: false })).toBe(false)
    expect(isTypingTarget({ tagName: 'BODY', isContentEditable: false })).toBe(false)
    expect(isTypingTarget(null)).toBe(false)
  })
})
