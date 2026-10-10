import type { CSSProperties } from 'react'
import { MapPanel } from './panels/MapPanel'
import { AlertsList } from './panels/AlertsList'
import { StreamsGrid } from './panels/StreamsGrid'
import { Placeholder } from './panels/Placeholder'
import { Splitter } from './panels/Splitter'
import { Topbar } from './panels/Topbar'
import { useLayout } from './state/layout'

export default function App() {
  const sideWidth = useLayout((s) => s.sideWidth)
  const bottomHeight = useLayout((s) => s.bottomHeight)
  const tracks = { '--side-w': `${sideWidth}px`, '--bottom-h': `${bottomHeight}px` } as CSSProperties

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
      <footer className="bottom">
        <AlertsList />
        <Placeholder code="AUD-01" title="Radio / Scanner" pkg="WP-06" />
        <Placeholder code="CCTV-01" title="DOT Cameras" pkg="WP-07" />
      </footer>
    </div>
  )
}
