import { MapPanel } from './panels/MapPanel'
import { AlertsList } from './panels/AlertsList'
import { StreamsGrid } from './panels/StreamsGrid'
import { AudioPanel } from './panels/AudioPanel'
import { Placeholder } from './panels/Placeholder'
import { Topbar } from './panels/Topbar'

export default function App() {
  return (
    <div className="layout">
      <Topbar />
      <main className="map-area">
        <MapPanel />
      </main>
      <aside className="side">
        <StreamsGrid />
      </aside>
      <footer className="bottom">
        <AlertsList />
        <AudioPanel />
        <Placeholder code="CCTV-01" title="DOT Cameras" pkg="WP-07" />
      </footer>
    </div>
  )
}
