import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { KeyboardShortcuts, KeysButton } from '../KeyboardShortcuts'
import helpCss from './help.css?raw'

vi.mock('../../map/LayerControl', () => ({ toggleLayer: vi.fn() }))
// A glossary term that is not in the group map: it must show under Other.
vi.mock('../../ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../ui')>()
  return { ...actual, GLOSSARY: { ...actual.GLOSSARY, ZZTEST: 'Injected test term' } }
})

/** Renders the top-bar button and the overlay host, then opens the help from the button (focus on the button first). */
function openHelp(): HTMLElement {
  render(
    <>
      <KeysButton />
      <KeyboardShortcuts />
    </>,
  )
  const opener = screen.getByRole('button', { name: '? HELP' })
  act(() => opener.focus())
  fireEvent.click(opener)
  return opener
}

const tab = (name: string) => screen.getByRole('tab', { name })
const selectedTab = () => screen.getByRole('tab', { selected: true }).textContent

describe('HelpDialog', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    // The open state is module-level: close any help left open so the next test starts closed.
    if (screen.queryByRole('dialog')) fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })
    cleanup()
    vi.restoreAllMocks()
    delete (window as { matchMedia?: unknown }).matchMedia
  })

  it('the help panel body has no max-height cap, at any width (index.css caps .panel-body at 900 px)', () => {
    openHelp()
    expect(screen.getByRole('dialog').querySelector('.panel-body')).not.toBeNull()
    // jsdom does not load index.css, so check the rule that overrides the cap in help.css (higher specificity).
    const rule = /\.help-dialog \.panel-body \{([^}]*)\}/.exec(helpCss)?.[1] ?? ''
    expect(rule).toMatch(/max-height:\s*none;/)
  })

  it('opens on SHORTCUTS with a fine pointer, with the Help panel code and close button first', () => {
    openHelp()
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByText('HLP-01')).toBeTruthy()
    expect(selectedTab()).toBe('SHORTCUTS')
    expect(screen.getByRole('heading', { name: 'Keyboard shortcuts' })).toBeTruthy()
  })

  it('switches tabs with a click', () => {
    openHelp()
    fireEvent.click(tab('ON SCREEN'))
    expect(tab('ON SCREEN').getAttribute('aria-selected')).toBe('true')
    expect(tab('SHORTCUTS').getAttribute('aria-selected')).toBe('false')
    expect(screen.getByRole('heading', { name: 'Area & time' })).toBeTruthy()
  })

  it('moves between tabs with the arrow keys, Home and End, and focuses the new tab', () => {
    openHelp()
    act(() => tab('SHORTCUTS').focus())
    fireEvent.keyDown(tab('SHORTCUTS'), { key: 'ArrowRight' })
    expect(selectedTab()).toBe('ON SCREEN')
    expect(document.activeElement).toBe(tab('ON SCREEN'))
    fireEvent.keyDown(tab('ON SCREEN'), { key: 'End' })
    expect(selectedTab()).toBe('CHASER TERMS')
    fireEvent.keyDown(tab('CHASER TERMS'), { key: 'ArrowRight' })
    expect(selectedTab()).toBe('SHORTCUTS')
    fireEvent.keyDown(tab('SHORTCUTS'), { key: 'ArrowLeft' })
    expect(selectedTab()).toBe('CHASER TERMS')
    fireEvent.keyDown(tab('CHASER TERMS'), { key: 'Home' })
    expect(selectedTab()).toBe('SHORTCUTS')
  })

  it('finds the RFD entry on CHASER TERMS by its abbreviation', () => {
    openHelp()
    fireEvent.click(tab('CHASER TERMS'))
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search help' }), { target: { value: 'rfd' } })
    expect(screen.getByText('RFD')).toBeTruthy()
    expect(screen.getByText('Rear-flank downdraft')).toBeTruthy()
    // Also "Clear slot", whose meaning mentions the RFD.
    expect(screen.getByText('2 MATCHES')).toBeTruthy()
  })

  it('finds TOR on ON SCREEN', () => {
    openHelp()
    fireEvent.click(tab('ON SCREEN'))
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search help' }), { target: { value: 'tor' } })
    expect(screen.getByText('TOR')).toBeTruthy()
    expect(screen.queryByText('ZZTEST')).toBeNull()
  })

  it('typing on SHORTCUTS with no shortcut match jumps to the first tab with matches', () => {
    openHelp()
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search help' }), { target: { value: 'rfd' } })
    expect(selectedTab()).toBe('CHASER TERMS')
  })

  it('shows the empty state when no tab matches, and stays on the current tab', () => {
    openHelp()
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search help' }), { target: { value: 'xyz' } })
    expect(selectedTab()).toBe('SHORTCUTS')
    expect(screen.getByText('NO TERMS MATCH "xyz"')).toBeTruthy()
  })

  it('puts a glossary term missing from the group map under Other', () => {
    openHelp()
    fireEvent.click(tab('ON SCREEN'))
    expect(screen.getByRole('heading', { name: 'Other' })).toBeTruthy()
    expect(screen.getByText('ZZTEST')).toBeTruthy()
    expect(screen.getByText('Injected test term')).toBeTruthy()
  })

  it('ignores the global shortcut keys typed in the search box', () => {
    openHelp()
    const search = screen.getByRole('searchbox', { name: 'Search help' })
    act(() => search.focus())
    fireEvent.keyDown(search, { key: '?' })
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('Esc closes the help from the search box and returns focus to the opener', () => {
    const opener = openHelp()
    const search = screen.getByRole('searchbox', { name: 'Search help' })
    act(() => search.focus())
    fireEvent.keyDown(search, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(opener)
  })

  it('remembers the last tab across openings', () => {
    openHelp()
    fireEvent.click(tab('CHASER TERMS'))
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '? HELP' }))
    expect(selectedTab()).toBe('CHASER TERMS')
    expect(window.localStorage.getItem('storm-chasers.help.tab')).toBe('chasers')
  })

  it('opens on ON SCREEN on a touch screen when nothing is remembered', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia
    openHelp()
    expect(selectedTab()).toBe('ON SCREEN')
  })
})
