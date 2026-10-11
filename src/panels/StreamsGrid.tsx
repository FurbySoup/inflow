import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

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
import { applyResolution, withAutoplay, type FeedStatus, type LiveFeed } from '../sources/streams/resolve'
import { useLiveness } from '../sources/streams/useLiveness'
import { useAoi } from '../state/aoi'
import { Badge, StreamTile } from '../ui'
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

const STATUS_LABEL: Partial<Record<FeedStatus, string>> = { ended: 'ENDED', offline: 'OFFLINE' }

/** Wraps a tile to report whether it is on screen. root: null is the viewport, so a tile clipped by a scrolling feeds panel (desktop) or the page (narrow) counts as off. */
function FeedSlot({
  id,
  onVisible,
  children,
}: {
  id: string
  onVisible: (id: string, visible: boolean) => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      onVisible(id, true)
      return
    }
    const io = new IntersectionObserver(([entry]) => onVisible(id, entry?.isIntersecting ?? false), { root: null })
    io.observe(el)
    return () => {
      io.disconnect()
      onVisible(id, false)
    }
  }, [id, onVisible])
  return <div ref={ref}>{children}</div>
}

function StatusBadge({ status }: { status?: FeedStatus }) {
  const label = status ? STATUS_LABEL[status] : undefined
  return label ? <Badge variant="ctx">{label}</Badge> : null
}

export function StreamsGrid() {
  const states = useAoi((s) => s.states)
  const [primaryId, setPrimaryId] = useState<string | null>(() => loadPrimaryId())
  const [soundOn, setSoundOn] = useState(() => loadMainSound())
  const activated = useUserActivated()
  const [onScreen, setOnScreen] = useState<ReadonlySet<string>>(() => new Set())
  const [checkedPrimary, setCheckedPrimary] = useState<string | null>(null)
  const setVisible = useCallback((id: string, visible: boolean) => {
    setOnScreen((prev) => {
      if (prev.has(id) === visible) return prev
      const next = new Set(prev)
      if (visible) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])

  // Liveness runs for the primary and on-screen tiles only (ADR-0013). The primary is included so a
  // default primary that turns out to be ENDED is checked once it is shown.
  const resolutions = useLiveness(curatedStreams, (id) => onScreen.has(id) || id === checkedPrimary)
  const feeds: LiveFeed[] = curatedStreams.map((s) => applyResolution(s, resolutions.get(s.id)))
  // Streams in the AOI first; others still shown so a chaser is never hidden by map panning.
  const sorted = sortStreams(feeds, states)
  const { primary, thumbs } = layoutStreams(sorted, primaryId)
  if ((primary?.id ?? null) !== checkedPrimary) setCheckedPrimary(primary?.id ?? null)

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
        <FeedSlot id={primary.id} onVisible={setVisible}>
          <StatusBadge status={primary.status} />
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
        </FeedSlot>
      )}
      <div className="stream-grid">
        {thumbs.map((s) => (
          // Off-screen thumbs drop autoplay, so they stay paused and do not decode (ADR-0013).
          <FeedSlot key={s.id} id={s.id} onVisible={setVisible}>
            <StatusBadge status={s.status} />
            <StreamTile
              title={s.title}
              embedUrl={withAutoplay(s.embedUrl, onScreen.has(s.id))}
              watchUrl={s.watchUrl}
              index={sorted.indexOf(s)}
              inAoi={isInAoi(s, states)}
              context={s.context}
              onSelect={() => choose(s.id)}
            />
          </FeedSlot>
        ))}
      </div>
    </Panel>
  )
}
