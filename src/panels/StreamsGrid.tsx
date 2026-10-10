import { useEffect, useMemo, useState } from 'react'

import { curatedStreams } from '../sources/streams/curated'
import {
  isInAoi,
  layoutStreams,
  loadMainSound,
  loadPrimaryId,
  saveMainSound,
  savePrimaryId,
  sortStreams,
  withSound,
} from '../sources/streams/layout'
import { useAoi } from '../state/aoi'
import { StreamTile } from '../ui'
import { Panel } from './Panel'

// Browsers block autoplay-with-sound until the page has had a user gesture, so the main feed only
// switches to an unmuted embed after the first click/keypress (a swap click counts).
function useUserActivated() {
  const [active, setActive] = useState(() => navigator.userActivation?.hasBeenActive ?? false)
  useEffect(() => {
    if (active) return
    const on = () => setActive(true)
    window.addEventListener('pointerdown', on, { once: true, capture: true })
    window.addEventListener('keydown', on, { once: true, capture: true })
    return () => {
      window.removeEventListener('pointerdown', on, { capture: true })
      window.removeEventListener('keydown', on, { capture: true })
    }
  }, [active])
  return active
}

export function StreamsGrid() {
  const states = useAoi((s) => s.states)
  // Streams in the AOI first; others still shown so a chaser is never hidden by map panning.
  const sorted = useMemo(() => sortStreams(curatedStreams, states), [states])
  const [primaryId, setPrimaryId] = useState<string | null>(() => loadPrimaryId())
  const [soundOn, setSoundOn] = useState(() => loadMainSound())
  const activated = useUserActivated()
  const { primary, thumbs } = layoutStreams(sorted, primaryId)

  const choose = (id: string) => {
    setPrimaryId(id)
    savePrimaryId(id)
  }

  const toggleSound = () => {
    setSoundOn((on) => {
      saveMainSound(!on)
      return !on
    })
  }

  return (
    <Panel collapsible code="VID-01" title="Chaser Feeds" status="live" meta={sorted.length} className="streams">
      {primary && (
        <StreamTile
          title={primary.title}
          embedUrl={withSound(primary.embedUrl, soundOn && activated)}
          watchUrl={primary.watchUrl}
          index={sorted.indexOf(primary)}
          inAoi={isInAoi(primary, states)}
          context={primary.context}
          primary
          onSelect={() => choose(primary.id)}
          soundOn={soundOn}
          onToggleSound={toggleSound}
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
