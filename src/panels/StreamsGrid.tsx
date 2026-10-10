import { useMemo, useState } from 'react'

import { curatedStreams, type ChaserStream } from '../sources/streams/curated'
import { isInAoi, layoutStreams, loadPrimaryId, savePrimaryId, sortStreams } from '../sources/streams/layout'
import { useAoi } from '../state/aoi'
import { Panel } from './Panel'

const badge = {
  fontFamily: 'var(--font-data)',
  fontSize: '0.65rem',
  letterSpacing: '0.08em',
  padding: '0 4px',
  marginLeft: 6,
  border: '1px solid currentColor',
} as const

const selectButton = {
  background: 'none',
  border: 'none',
  padding: 0,
  color: 'inherit',
  font: 'inherit',
  textAlign: 'left',
  cursor: 'pointer',
} as const

export function StreamsGrid() {
  const states = useAoi((s) => s.states)
  // Streams in the AOI first; others still shown so a chaser is never hidden by map panning.
  const sorted = useMemo(() => sortStreams(curatedStreams, states), [states])
  const [primaryId, setPrimaryId] = useState<string | null>(() => loadPrimaryId())
  const { primary, thumbs } = layoutStreams(sorted, primaryId)

  const choose = (id: string) => {
    setPrimaryId(id)
    savePrimaryId(id)
  }

  const renderFigure = (s: ChaserStream, index: number, isPrimary: boolean) => (
    <figure key={s.id}>
      <iframe
        src={s.embedUrl}
        title={s.title}
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
      />
      <figcaption>
        <button
          type="button"
          style={selectButton}
          onClick={() => choose(s.id)}
          aria-current={isPrimary ? 'true' : undefined}
          title="Show this feed large"
        >
          <span className="panel-code">CAM {String(index + 1).padStart(2, '0')}</span> {s.title}
        </button>
        {isInAoi(s, states) && (
          <span style={{ ...badge, color: 'var(--accent)' }}>IN AOI</span>
        )}
        {s.context && <span style={{ ...badge, color: 'var(--muted)' }}>CTX</span>}
        <a
          href={s.watchUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${s.title} on YouTube`}
          style={{ marginLeft: 6, color: 'var(--accent)', textDecoration: 'none' }}
        >
          ↗
        </a>
      </figcaption>
    </figure>
  )

  return (
    <Panel code="VID-01" title="Chaser Feeds" status="live" meta={sorted.length} className="streams">
      {primary && <div>{renderFigure(primary, sorted.indexOf(primary), true)}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
        {thumbs.map((s) => renderFigure(s, sorted.indexOf(s), false))}
      </div>
    </Panel>
  )
}
