import type { CSSProperties } from 'react'
import { MapPanel } from './panels/MapPanel'
import { AlertsList } from './panels/AlertsList'
import { StreamsGrid } from './panels/StreamsGrid'
import { AudioPanel } from './panels/AudioPanel'
import { CamerasPanel } from './panels/CamerasPanel'
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
        <AudioPanel />
        <CamerasPanel />
      </footer>
    </div>
  )
}
