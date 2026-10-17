import { Fragment, useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type RefObject } from 'react'
import { ConsoleButton, GLOSSARY, Panel } from '../../ui'
import { CHASER_TERMS } from './chaserTerms'
import { AboutTab } from './AboutTab'
import { StartHereTab } from './StartHereTab'
import { buildGlossaryGroups, countEntries, filterGroups, type HelpEntry, type HelpGroup } from './helpSearch'
import './help.css'

// The `? HELP` overlay (WP-40, ABOUT in WP-47, START HERE in WP-52): three searchable tabs, and START HERE and ABOUT
// which are not searched. Opening, closing and the keys live in KeyboardShortcuts.tsx, which renders this with the
// dialog ref it needs for the focus trap.

type TabId = 'start' | 'shortcuts' | 'screen' | 'chasers' | 'about'

const TABS: readonly { id: TabId; label: string }[] = [
  { id: 'start', label: 'START HERE' },
  { id: 'shortcuts', label: 'SHORTCUTS' },
  { id: 'screen', label: 'ON SCREEN' },
  { id: 'chasers', label: 'CHASER TERMS' },
  { id: 'about', label: 'ABOUT' },
]

const TAB_STORAGE_KEY = 'storm-chasers.help.tab'

const ROWS: readonly { keys: readonly string[]; label: string }[] = [
  { keys: ['[', ']'], label: 'Previous / next primary stream' },
  { keys: ['1', '2', '3'], label: 'AOI preset: Plains, Dixie Alley, Southeast' },
  { keys: ['Shift+1', 'Shift+2', 'Shift+3'], label: 'Layout preset: DEFAULT, WALL, CHASE' },
  { keys: ['R'], label: 'Toggle radar' },
  { keys: ['V'], label: 'Toggle velocity (SRV, nearest radar)' },
  { keys: ['S'], label: 'Toggle satellite' },
  { keys: ['W'], label: 'Toggle watch outlines (SPC and NWS)' },
  { keys: ['F'], label: 'Toggle fullscreen' },
  { keys: ['?'], label: 'Show or hide this help' },
  { keys: ['Esc'], label: 'Close this help' },
]

interface ShortcutItem extends HelpEntry {
  keys: readonly string[]
}

const SHORTCUT_GROUPS: readonly HelpGroup<ShortcutItem>[] = [
  {
    group: 'Keyboard shortcuts',
    terms: ROWS.map((r) => ({ term: r.keys.join(' '), keys: r.keys, meaning: r.label })),
  },
]

/** Display grouping for GLOSSARY. Terms not listed here fall into `Other`, so a new glossary entry is never lost. */
const GLOSSARY_GROUPS: readonly { group: string; terms: readonly string[] }[] = [
  { group: 'Area and time', terms: ['AOI', 'IN AOI', 'UTC', 'Z', 'LOCAL', 'T-'] },
  { group: 'Agencies and products', terms: ['NWS', 'SPC', 'MD', 'HWO', 'CWA', 'NOAA', 'IEM'] },
  { group: 'NWS alerts', terms: ['TOR', 'SVR', 'FFW', 'TOA', 'SVA', 'SPS', 'OTHER', 'PDS', 'EMERGENCY', 'ZONE'] },
  { group: 'SPC risk', terms: ['TSTM', 'MRGL', 'SLGT', 'ENH', 'MDT', 'HIGH', 'PREDICTABILITY TOO LOW', 'POTENTIAL TOO LOW'] },
  { group: 'Radar and satellite', terms: ['NEXRAD', 'SRV', 'GOES', 'IR'] },
  { group: 'Streams and cameras', terms: ['CTX', 'THUMB', 'DOT', 'CCTV'] },
  { group: 'Radio', terms: ['CB', '2M', 'RX', 'TG', 'SDR', 'HF'] },
  { group: 'Licences and tech', terms: ['API', 'ODbL', 'MIT'] },
]

const SCREEN_GROUPS = buildGlossaryGroups(GLOSSARY, GLOSSARY_GROUPS)

function countFor(id: TabId, query: string): number {
  switch (id) {
    case 'shortcuts':
      return countEntries(filterGroups(SHORTCUT_GROUPS, query))
    case 'screen':
      return countEntries(filterGroups(SCREEN_GROUPS, query))
    case 'chasers':
      return countEntries(filterGroups(CHASER_TERMS, query))
    case 'start':
    case 'about':
      return 0
  }
}

function readStoredTab(): TabId | null {
  try {
    const stored = window.localStorage.getItem(TAB_STORAGE_KEY)
    return TABS.find((t) => t.id === stored)?.id ?? null
  } catch {
    return null
  }
}

function storeTab(id: TabId): void {
  try {
    window.localStorage.setItem(TAB_STORAGE_KEY, id)
  } catch {
    // Storage is unavailable (private mode, disabled): the tab simply is not remembered.
  }
}

/** Opens on START HERE for everyone until a tab is chosen; the choice is then remembered (WP-52). */
function initialTab(): TabId {
  return readStoredTab() ?? 'start'
}

export interface HelpDialogProps {
  /** Attached to the dialog element so KeyboardShortcuts can trap Tab inside it. */
  dialogRef: RefObject<HTMLDivElement | null>
  onClose: () => void
}

/**
 * The help overlay: START HERE, SHORTCUTS, ON SCREEN (glossary) and CHASER TERMS tabs, with one search box that
 * filters the active tab; START HERE and ABOUT are not searched. Signifier: the tabs are outlined accent buttons,
 * the selected one solid (ADR-0012). The search box and the group jump buttons have a focus ring and no hover-only
 * meaning. Closing is the ESC button, the backdrop, or Esc (handled in KeyboardShortcuts).
 */
export function HelpDialog({ dialogRef, onClose }: HelpDialogProps) {
  const [tab, setTab] = useState<TabId>(initialTab)
  const [query, setQuery] = useState('')
  const bodyRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const baseId = useId()

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0
  }, [tab])

  const shortcutGroups = filterGroups(SHORTCUT_GROUPS, query)
  const screenGroups = filterGroups(SCREEN_GROUPS, query)
  const chaserGroups = filterGroups(CHASER_TERMS, query)
  const trimmed = query.trim()
  const count = countFor(tab, query)
  const searchable = tab === 'shortcuts' || tab === 'screen' || tab === 'chasers'
  const emptyForTab = searchable && trimmed !== '' && count === 0

  function choose(id: TabId): void {
    setTab(id)
    storeTab(id)
  }

  function changeQuery(next: string): void {
    setQuery(next)
    // Typing on SHORTCUTS with no shortcut match moves to the first tab that has matches. START HERE and ABOUT count 0, so they are never chosen.
    if (tab !== 'shortcuts' || next.trim() === '' || countFor('shortcuts', next) > 0) return
    const hit = TABS.find((t) => countFor(t.id, next) > 0)
    if (hit) choose(hit.id)
  }

  function onTabKey(e: ReactKeyboardEvent<HTMLButtonElement>, index: number): void {
    let next: number
    if (e.key === 'ArrowRight') next = (index + 1) % TABS.length
    else if (e.key === 'ArrowLeft') next = (index - 1 + TABS.length) % TABS.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = TABS.length - 1
    else return
    e.preventDefault()
    const target = TABS[next]
    if (!target) return
    choose(target.id)
    tabRefs.current[next]?.focus()
  }

  function jumpTo(index: number): void {
    const el = bodyRef.current?.querySelector<HTMLElement>(`[data-group-index="${index}"]`)
    if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'start' })
  }

  const termGroups = tab === 'screen' ? screenGroups : tab === 'chasers' ? chaserGroups : []
  const emptyText = (
    <p className="help-empty">NO TERMS MATCH &quot;{trimmed}&quot;</p>
  )

  return (
    <div
      className="help-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div ref={dialogRef} className="help-dialog" role="dialog" aria-modal="true" aria-label="Help: shortcuts, on-screen terms, chaser terms and about">
        <Panel
          code="HLP-01"
          title="Help"
          status="offline"
          meta={
            <ConsoleButton aria-label="ESC: close help" onClick={onClose}>
              ESC
            </ConsoleButton>
          }
        >
          <div className="help-tabs" role="tablist" aria-label="Help sections">
            {TABS.map((t, i) => (
              <button
                key={t.id}
                ref={(el) => {
                  tabRefs.current[i] = el
                }}
                type="button"
                role="tab"
                id={`${baseId}-tab-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls={`${baseId}-panel`}
                tabIndex={tab === t.id ? 0 : -1}
                className="help-tab"
                onClick={() => choose(t.id)}
                onKeyDown={(e) => onTabKey(e, i)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {searchable && (
            <div className="help-toolbar">
              <input
                type="search"
                className="help-search"
                placeholder="Search terms"
                aria-label="Search help"
                value={query}
                onChange={(e) => changeQuery(e.target.value)}
              />
              {trimmed !== '' && (
                <span className="help-count" role="status">
                  {count === 1 ? '1 MATCH' : `${count} MATCHES`}
                </span>
              )}
              {termGroups.length > 0 && (
                <div className="help-jump-bar" role="group" aria-label="Jump to group">
                  {termGroups.map((g, i) => (
                    <button key={g.group} type="button" className="help-jump" onClick={() => jumpTo(i)}>
                      {g.group}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div ref={bodyRef} className="help-body" role="tabpanel" id={`${baseId}-panel`} aria-labelledby={`${baseId}-tab-${tab}`}>
            {tab === 'shortcuts' && (
              <>
                {shortcutGroups.map((g) => (
                  <Fragment key={g.group}>
                    <h3 className="help-group-title">{g.group}</h3>
                    <div className="help-keys">
                      {g.terms.map((row) => (
                        <div key={row.meaning} className="help-key-row">
                          <span className="help-keycaps">
                            {row.keys.map((k) => (
                              <kbd key={k} className="help-keycap">
                                {k}
                              </kbd>
                            ))}
                          </span>
                          <span className="help-key-label">{row.meaning}</span>
                        </div>
                      ))}
                    </div>
                  </Fragment>
                ))}
                {emptyForTab && emptyText}
                <p className="help-foot">
                  Keys are ignored while typing in a field. A focused YouTube player keeps the keyboard for itself: click elsewhere
                  on the page first.
                </p>
              </>
            )}

            {tab === 'start' && <StartHereTab />}

            {tab === 'about' && <AboutTab />}

            {(tab === 'screen' || tab === 'chasers') && (
              <>
                <div className="help-grid">
                  {termGroups.map((g, i) => (
                    <Fragment key={g.group}>
                      <h3 className="help-group-title" data-group-index={i}>
                        {g.group}
                      </h3>
                      {g.terms.map((t) => (
                        <div key={t.term} className="help-entry">
                          <div>
                            <span className="help-term">{t.term}</span>
                            {t.stands && <span className="help-stands">{t.stands}</span>}
                          </div>
                          <p className="help-meaning">{t.meaning}</p>
                        </div>
                      ))}
                    </Fragment>
                  ))}
                </div>
                {emptyForTab && emptyText}
              </>
            )}
          </div>
        </Panel>
      </div>
    </div>
  )
}
