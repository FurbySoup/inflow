import { useMemo, useState } from 'react'

import { curatedStreams } from '../sources/streams/curated'
import { isInAoi, layoutStreams, loadPrimaryId, savePrimaryId, sortStreams } from '../sources/streams/layout'
import { useAoi } from '../state/aoi'
import { StreamTile } from '../ui'
import { Panel } from './Panel'

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

  return (
    <Panel collapsible code="VID-01" title="Chaser Feeds" status="live" meta={sorted.length} className="streams">
      {primary && (
        <StreamTile
          title={primary.title}
          embedUrl={primary.embedUrl}
          watchUrl={primary.watchUrl}
          index={sorted.indexOf(primary)}
          inAoi={isInAoi(primary, states)}
          context={primary.context}
          primary
          onSelect={() => choose(primary.id)}
        />
      )}
      <div className="stream-grid">
        {thumbs.map((s) => (
          <StreamTile
            key={s.id}
            title={s.title}
            embedUrl={s.embedUrl}
            watchUrl={s.watchUrl}
            index={sorted.indexOf(s)}
            inAoi={isInAoi(s, states)}
            context={s.context}
            onSelect={() => choose(s.id)}
          />
        ))}
      </div>
    </Panel>
  )
}
