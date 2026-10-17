import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { KeyboardShortcuts, KeysButton } from '../KeyboardShortcuts'

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

  it('the help panel body has no max-height cap, at any width (index.css caps .panel-body at 900 px)', async () => {
    openHelp()
    expect(screen.getByRole('dialog').querySelector('.panel-body')).not.toBeNull()
    // jsdom does not load index.css, and vitest blanks CSS imports, so read help.css from disk. The id is a
    // variable so the type checker leaves node:fs alone (Node types are not part of this project).
    // npm test runs from the project root, which is the path below.
    const fsId: string = 'node:fs'
    const { readFileSync } = (await import(/* @vite-ignore */ fsId)) as {
      readFileSync: (path: string, encoding: 'utf8') => string
    }
    const helpCss = readFileSync('src/panels/help/help.css', 'utf8')
    // The rule that overrides the cap in index.css (its specificity is higher than `.panel-body`).
    const rule = /\.help-dialog \.panel-body \{([^}]*)\}/.exec(helpCss)?.[1] ?? ''
    expect(rule).toMatch(/max-height:\s*none;/)
  })

  it('opens on START HERE with a fine pointer, with the Help panel code first', () => {
    openHelp()
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByText('HLP-01')).toBeTruthy()
    expect(selectedTab()).toBe('START HERE')
  })

  it('opens on START HERE with a coarse pointer too', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia
    openHelp()
    expect(selectedTab()).toBe('START HERE')
  })

  it('shows the six START HERE steps as a numbered list, with a glossary tip inside', () => {
    openHelp()
    const items = within(screen.getByRole('tabpanel')).getAllByRole('listitem')
    expect(items).toHaveLength(6)
    expect(screen.getByRole('list').tagName).toBe('OL')
    expect(screen.getByText('SPC', { selector: 'abbr' }).getAttribute('title')).toBeTruthy()
  })

  it('has no search box on START HERE', () => {
    openHelp()
    expect(screen.queryByRole('searchbox', { name: 'Search help' })).toBeNull()
  })

  it('lists the tabs in keyboard order: START HERE, SHORTCUTS, ON SCREEN, CHASER TERMS, ABOUT', () => {
    openHelp()
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual([
      'START HERE',
      'SHORTCUTS',
      'ON SCREEN',
      'CHASER TERMS',
      'ABOUT',
    ])
  })

  it('never jumps to START HERE for a query, since it is not searched', () => {
    openHelp()
    fireEvent.click(tab('SHORTCUTS'))
    // Matches only a START HERE step, so no tab has it: the view must stay on SHORTCUTS.
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search help' }), { target: { value: 'Pick an area' } })
    expect(selectedTab()).toBe('SHORTCUTS')
  })

  it('has no ampersand in any ON SCREEN group name', () => {
    openHelp()
    fireEvent.click(tab('ON SCREEN'))
    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent ?? '')
    expect(headings.length).toBeGreaterThan(0)
    for (const h of headings) expect(h).not.toContain('&')
    expect(screen.getByRole('heading', { name: 'Area and time' })).toBeTruthy()
  })

  it('switches tabs with a click', () => {
    openHelp()
    fireEvent.click(tab('ON SCREEN'))
    expect(tab('ON SCREEN').getAttribute('aria-selected')).toBe('true')
    expect(tab('SHORTCUTS').getAttribute('aria-selected')).toBe('false')
    expect(screen.getByRole('heading', { name: 'Area and time' })).toBeTruthy()
  })

  it('moves between tabs with the arrow keys, Home and End, and focuses the new tab', () => {
    openHelp()
    act(() => tab('SHORTCUTS').focus())
    fireEvent.keyDown(tab('SHORTCUTS'), { key: 'ArrowRight' })
    expect(selectedTab()).toBe('ON SCREEN')
    expect(document.activeElement).toBe(tab('ON SCREEN'))
    fireEvent.keyDown(tab('ON SCREEN'), { key: 'End' })
    expect(selectedTab()).toBe('ABOUT')
    fireEvent.keyDown(tab('ABOUT'), { key: 'ArrowRight' })
    expect(selectedTab()).toBe('START HERE')
    fireEvent.keyDown(tab('START HERE'), { key: 'ArrowRight' })
    expect(selectedTab()).toBe('SHORTCUTS')
    fireEvent.keyDown(tab('SHORTCUTS'), { key: 'ArrowLeft' })
    expect(selectedTab()).toBe('START HERE')
    fireEvent.keyDown(tab('START HERE'), { key: 'ArrowLeft' })
    expect(selectedTab()).toBe('ABOUT')
    fireEvent.keyDown(tab('ABOUT'), { key: 'ArrowLeft' })
    expect(selectedTab()).toBe('CHASER TERMS')
    fireEvent.keyDown(tab('CHASER TERMS'), { key: 'Home' })
    expect(selectedTab()).toBe('START HERE')
    fireEvent.keyDown(tab('START HERE'), { key: 'ArrowRight' })
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
    fireEvent.click(tab('SHORTCUTS'))
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search help' }), { target: { value: 'rfd' } })
    expect(selectedTab()).toBe('CHASER TERMS')
  })

  it('shows the empty state when no tab matches, and stays on the current tab', () => {
    openHelp()
    fireEvent.click(tab('SHORTCUTS'))
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
    fireEvent.click(tab('SHORTCUTS'))
    const search = screen.getByRole('searchbox', { name: 'Search help' })
    act(() => search.focus())
    fireEvent.keyDown(search, { key: '?' })
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('Esc closes the help from the search box and returns focus to the opener', () => {
    const opener = openHelp()
    fireEvent.click(tab('SHORTCUTS'))
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

  it('opens on the remembered tab over START HERE', () => {
    window.localStorage.setItem('storm-chasers.help.tab', 'shortcuts')
    openHelp()
    expect(selectedTab()).toBe('SHORTCUTS')
  })

  it('reaches ABOUT by click, and by End from the first tab', () => {
    openHelp()
    fireEvent.click(tab('ABOUT'))
    expect(selectedTab()).toBe('ABOUT')
    expect(screen.getByRole('note')).toBeTruthy()
    act(() => tab('SHORTCUTS').focus())
    fireEvent.keyDown(tab('SHORTCUTS'), { key: 'End' })
    expect(selectedTab()).toBe('ABOUT')
    expect(document.activeElement).toBe(tab('ABOUT'))
  })

  it('hides the search on ABOUT and keeps the query for when the user comes back', () => {
    openHelp()
    fireEvent.click(tab('CHASER TERMS'))
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search help' }), { target: { value: 'rfd' } })
    fireEvent.click(tab('ABOUT'))
    expect(screen.queryByRole('searchbox', { name: 'Search help' })).toBeNull()
    fireEvent.click(tab('CHASER TERMS'))
    expect((screen.getByRole('searchbox', { name: 'Search help' }) as HTMLInputElement).value).toBe('rfd')
    expect(screen.getByText('2 MATCHES')).toBeTruthy()
  })

  it('reopens on ABOUT when ABOUT was the stored tab', () => {
    window.localStorage.setItem('storm-chasers.help.tab', 'about')
    openHelp()
    expect(selectedTab()).toBe('ABOUT')
  })

  it('does not jump to ABOUT for a query that only the ABOUT text contains', () => {
    openHelp()
    fireEvent.click(tab('SHORTCUTS'))
    // "Federal government" appears only in the ABOUT credits, which the search never covers.
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search help' }), { target: { value: 'Federal government' } })
    expect(selectedTab()).toBe('SHORTCUTS')
    expect(screen.getByText('NO TERMS MATCH "Federal government"')).toBeTruthy()
  })

  it('lists the new agency, radio and licence terms outside the Other group on ON SCREEN', () => {
    openHelp()
    fireEvent.click(tab('ON SCREEN'))
    const groupOf = (term: string): string | undefined => {
      let sib = screen.getByText(term, { selector: '.help-term' }).closest('.help-entry')?.previousElementSibling
      while (sib && sib.tagName !== 'H3') sib = sib.previousElementSibling
      return sib?.textContent ?? undefined
    }
    expect(groupOf('NOAA')).toBe('Agencies and products')
    expect(groupOf('IEM')).toBe('Agencies and products')
    expect(groupOf('HF')).toBe('Radio')
    expect(groupOf('API')).toBe('Licences and tech')
    expect(groupOf('ODbL')).toBe('Licences and tech')
    expect(groupOf('MIT')).toBe('Licences and tech')
  })
})
