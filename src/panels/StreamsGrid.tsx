import { curatedStreams } from '../sources/streams/curated'
import { useAoi } from '../state/aoi'
import { Panel } from './Panel'

export function StreamsGrid() {
  const states = useAoi((s) => s.states)
  // Streams in the AOI first; others still shown so a chaser is never hidden by map panning.
  const sorted = [...curatedStreams].sort(
    (a, b) =>
      Number(b.states.some((s) => states.includes(s))) -
      Number(a.states.some((s) => states.includes(s))),
  )

  return (
    <Panel code="VID-01" title="Chaser Feeds" status="live" meta={sorted.length} className="streams">
      {sorted.map((s, i) => (
        <figure key={s.id}>
          <iframe
            src={s.embedUrl}
            title={s.title}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
          <figcaption>
            <span className="panel-code">CAM {String(i + 1).padStart(2, '0')}</span> {s.title}
          </figcaption>
        </figure>
      ))}
    </Panel>
  )
}
