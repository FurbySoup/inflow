import type { CSSProperties } from 'react'
import { MapPanel } from './panels/MapPanel'
import { AlertsList } from './panels/AlertsList'
import { StreamsGrid } from './panels/StreamsGrid'
import { AudioPanel } from './panels/AudioPanel'
import { CamerasPanel } from './panels/CamerasPanel'
import { ConsoleSplitter, Splitter } from './panels/Splitter'
import { Topbar } from './panels/Topbar'
import { useLayout } from './state/layout'

// Panel codes of the console row, left to right (must match each panel's `code`).
const CONSOLE_CODES = ['WX-02', 'AUD-01', 'CCTV-01'] as const

export default function App() {
  const sideWidth = useLayout((s) => s.sideWidth)
  const bottomHeight = useLayout((s) => s.bottomHeight)
  const split = useLayout((s) => s.consoleSplit)
  const hidden = useLayout((s) => s.hidden)
  const tracks = { '--side-w': `${sideWidth}px`, '--bottom-h': `${bottomHeight}px` } as CSSProperties

  // Collapsed console panels take an auto (header-width) track; the rest share the row by their
  // fractions, renormalised so they fill it when a sibling is collapsed.
  const collapsed = CONSOLE_CODES.map((code) => hidden.includes(code))
  const visibleTotal = split.reduce((sum, f, i) => (collapsed[i] ? sum : sum + f), 0)
  const track = (i: number) =>
    collapsed[i] ? 'auto' : `minmax(0, ${split[i] / visibleTotal}fr)`
  const consoleTracks = {
    '--c1': track(0),
    '--c2': track(1),
    '--c3': track(2),
  } as CSSProperties

  return (
    <div className="layout" style={tracks}>
      <Topbar />
      <main className="map-area">
        <MapPanel />
      </main>
      <Splitter target="sideWidth" area="vsplit" />
      <aside className="side">
        <StreamsGrid />
      </aside>
      <Splitter target="bottomHeight" area="hsplit" />
      <footer className="bottom" style={consoleTracks}>
        <div className="console-cell">
          <AlertsList />
        </div>
        <ConsoleSplitter boundary={0} disabled={collapsed[0] || collapsed[1]} />
        <div className="console-cell">
          <AudioPanel />
        </div>
        <ConsoleSplitter boundary={1} disabled={collapsed[1] || collapsed[2]} />
        <div className="console-cell">
          <CamerasPanel />
        </div>
      </footer>
    </div>
  )
}
