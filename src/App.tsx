import { useSyncExternalStore, type CSSProperties } from 'react'
import { MapPanel } from './panels/MapPanel'
import { AlertsList } from './panels/AlertsList'
import { StreamsGrid } from './panels/StreamsGrid'
import { AudioPanel } from './panels/AudioPanel'
import { CamerasPanel } from './panels/CamerasPanel'
import { ConsoleSplitter, Splitter } from './panels/Splitter'
import { Topbar } from './panels/Topbar'
import { KeyboardShortcuts } from './panels/KeyboardShortcuts'
import { ToastRegion } from './panels/ToastRegion'
import { useLayout } from './state/layout'

// Panel codes of the console row, left to right (must match each panel's `code`).
const CONSOLE_CODES = ['WX-02', 'AUD-01', 'CCTV-01'] as const

const NARROW_QUERY = '(max-width: 900px)'

// Below the narrow breakpoint the mobile token set always applies (ADR-0015): it is automatic,
// not a stored preset, so the root's data-preset switches here rather than in CSS.
function useNarrow(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(NARROW_QUERY)
      mq.addEventListener('change', onChange)
      return () => mq.removeEventListener('change', onChange)
    },
    () => window.matchMedia(NARROW_QUERY).matches,
  )
}

export default function App() {
  const preset = useLayout((s) => s.preset)
  const sideWidth = useLayout((s) => s.sideWidth)
  const bottomHeight = useLayout((s) => s.bottomHeight)
  const split = useLayout((s) => s.consoleSplit)
  const hidden = useLayout((s) => s.hidden)
  const narrow = useNarrow()

  // Collapsed console panels take an auto (header-width) track; the rest share the row by their
  // fractions, renormalised so they fill it when a sibling is collapsed.
  const collapsed = CONSOLE_CODES.map((code) => hidden.includes(code))
  const visibleTotal = split.reduce((sum, f, i) => (collapsed[i] ? sum : sum + f), 0)
  const track = (i: number) =>
    collapsed[i] ? 'auto' : `minmax(0, ${split[i] / visibleTotal}fr)`

  // WALL and CHASE rows: an open console panel takes its preset's `--audio-open` / `--cams-open`
  // (index.css), a collapsed one the panel header height. DEFAULT ignores these.
  const vars = {
    '--side-w': `${sideWidth}px`,
    '--bottom-h': `${bottomHeight}px`,
    '--c1': track(0),
    '--c2': track(1),
    '--c3': track(2),
    '--row-audio': collapsed[1] ? 'var(--panel-head-h)' : 'var(--audio-open)',
    '--row-cams': collapsed[2] ? 'var(--panel-head-h)' : 'var(--cams-open)',
  } as CSSProperties

  return (
    <div className="layout" data-preset={narrow ? 'mobile' : preset.toLowerCase()} style={vars}>
      <Topbar />
      <div className="workspace">
        <main className="map-area">
          <MapPanel />
        </main>
        <Splitter target="sideWidth" area="vsplit" />
        <aside className="side">
          <StreamsGrid />
        </aside>
        <Splitter target="bottomHeight" area="hsplit" />
        <div className="console-cell cell-alerts">
          <AlertsList />
        </div>
        <ConsoleSplitter boundary={0} disabled={collapsed[0] || collapsed[1]} />
        <div className="console-cell cell-radio">
          <AudioPanel />
        </div>
        <ConsoleSplitter boundary={1} disabled={collapsed[1] || collapsed[2]} />
        <div className="console-cell cell-cams">
          <CamerasPanel />
        </div>
      </div>
      <KeyboardShortcuts />
      <ToastRegion />
    </div>
  )
}
