import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

import { curatedStreams } from '../sources/streams/curated'
import {
  isInAoi,
  layoutStreams,
  loadMainSound,
  saveMainSound,
  sortStreams,
  withSound,
} from '../sources/streams/layout'
import { applyResolution, shouldAutoplay, withAutoplay, type FeedStatus, type LiveFeed } from '../sources/streams/resolve'
import { liveKind, prunePlaying, startTile, stopTile } from '../sources/streams/playing'
import {
  isSnapshotStale,
  snapshotAgeLabel,
  snapshotPlaceholder,
  snapshotSource,
} from '../sources/streams/snapshot'
import { useLiveness } from '../sources/streams/useLiveness'
import { useSnapshotClock } from '../sources/streams/useSnapshots'
import { mergeRoster, rosterFeedId, rosterLive, spotterMapUrl } from '../sources/chasers/feeds'
import { ROSTER } from '../sources/chasers/roster'
import { useRoster } from '../sources/chasers/useRoster'
import { useAoi } from '../state/aoi'
import { useStreams } from '../state/streams'
import { useLayout } from '../state/layout'
import { Abbr, StreamTile, type FeedStatus as LedStatus } from '../ui'
import { LiveNow, type LiveNowChip } from './LiveNow'
import { Panel } from './Panel'

// Browsers block autoplay-with-sound until the page has had a user gesture, so the main feed only
// switches to an unmuted embed after the first click/keypress (a ▲ MAIN click counts).
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

const NONE: string[] = []
const COVERAGE_IDS = new Set(ROSTER.filter((c) => c.kind === 'coverage').map((c) => rosterFeedId(c.channelId)))

/** Feed health as the LED shape: live ●, ended/offline ○, unknown check ◐, not checked yet ◌. */
function ledFor(status: FeedStatus | undefined): LedStatus {
  if (status === 'live') return 'live'
  if (status === 'ended' || status === 'offline') return 'offline'
  if (status === 'unknown') return 'stale'
  return 'loading'
}

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

export function StreamsGrid() {
  const states = useAoi((s) => s.states)
  const bbox = useAoi((s) => s.bbox)
  const roster = useRoster()
  const primaryId = useStreams((s) => s.primaryId)
  const chosenThisSession = useStreams((s) => s.chosenThisSession)
  const singleStream = useLayout((s) => s.preset) === 'CHASE'
  const setPrimary = useStreams((s) => s.setPrimary)
  const setOrder = useStreams((s) => s.setOrder)
  const [soundOn, setSoundOn] = useState(() => loadMainSound())
  const activated = useUserActivated()
  const [onScreen, setOnScreen] = useState<ReadonlySet<string>>(() => new Set())
  const [checkedPrimary, setCheckedPrimary] = useState<string | null>(null)
  // User-started thumbnails (ADR-0017), oldest first. Session state only; never persisted.
  const [playing, setPlaying] = useState<string[]>(NONE)
  const setVisible = useCallback((id: string, visible: boolean) => {
    setOnScreen((prev) => {
      if (prev.has(id) === visible) return prev
      const next = new Set(prev)
      if (visible) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])
  // Stills re-fetch every 60 s for on-screen tiles only; `now` drives the THUMB age labels.
  const { now, refreshedAt } = useSnapshotClock(onScreen)

  // Liveness runs for the primary and on-screen tiles only (ADR-0013). The primary is included so a
  // default primary that turns out to be ENDED is checked once it is shown. Playing tiles count as on screen.
  const resolutions = useLiveness(curatedStreams, (id) => onScreen.has(id) || id === checkedPrimary || playing.includes(id))
  const curatedFeeds: LiveFeed[] = curatedStreams.map((s) => applyResolution(s, resolutions.get(s.id)))
  // Verified roster channels that are live join the feeds (WP-36); a curated entry on the same channel is not duplicated.
  const { feeds, videoIds: rosterVideoIds } = mergeRoster(curatedFeeds, rosterLive(ROSTER, roster.results))
  // Streams in the AOI first; others still shown so a chaser is never hidden by map panning.
  const sorted = sortStreams(feeds, states)
  const chips: LiveNowChip[] = sorted
    .filter((s) => s.status === 'live')
    .map((s) => ({ id: s.id, name: s.title, inAoi: isInAoi(s, states), coverage: COVERAGE_IDS.has(s.id) }))
  const { primary, thumbs } = layoutStreams(sorted, primaryId, chosenThisSession)
  if ((primary?.id ?? null) !== checkedPrimary) setCheckedPrimary(primary?.id ?? null)
  // CHASE shows no thumbnails, so nothing plays there. Offline, primary and vanished feeds are dropped (render-time, like checkedPrimary).
  const playingNow = singleStream ? NONE : prunePlaying(playing, sorted, primary?.id ?? null)
  if (playingNow !== playing) setPlaying(playingNow)
  const liveCount = sorted.filter((s) => s.status === 'live').length

  // Publish the sorted order and the feed in the main slot so shortcuts can cycle it.
  const orderKey = sorted.map((s) => s.id).join('|')
  const shownId = primary?.id ?? null
  useEffect(() => {
    setOrder(orderKey ? orderKey.split('|') : [], shownId)
  }, [orderKey, shownId, setOrder])

  const choose = setPrimary

  const toggleSound = () => {
    setSoundOn((on) => {
      saveMainSound(!on)
      return !on
    })
  }

  return (
    <Panel
      collapsible
      code="VID-01"
      title="Chaser Feeds"
      status="live"
      // Header meta: live count and the still refresh cadence (HANDOFF §9.10).
      meta={
        <>
          {`${liveCount}/${sorted.length} LIVE · `}
          <Abbr term="THUMBS" title="Thumbnails: still images, refreshed about every 5 minutes. WATCH plays one." />
          {' ≈5 MIN'}
        </>
      }
      className="streams"
    >
      <LiveNow chips={chips} shownId={primary?.id ?? null} checked={roster.results.size} total={ROSTER.length} />
      {primary && (
        <FeedSlot id={primary.id} onVisible={setVisible}>
          <StreamTile
            title={primary.title}
            index={sorted.indexOf(primary)}
            watchUrl={primary.watchUrl}
            inAoi={isInAoi(primary, states)}
            context={primary.context}
            ledStatus={ledFor(primary.status)}
            liveKind={liveKind(primary.status, 'videoId' in primary.youtube)}
            primary
            // Autoplay only once confirmed live: an unchecked or ENDED pin would replay the finished broadcast.
            embedUrl={withAutoplay(withSound(primary.embedUrl, soundOn && activated), shouldAutoplay(primary.status))}
            onSelect={() => choose(primary.id)}
            soundOn={soundOn}
            onToggleSound={toggleSound}
          />
        </FeedSlot>
      )}
      {singleStream ? (
        // CHASE preset (HANDOFF §5): one stream only; `[`/`]` still cycle the main feed.
        <p className="muted">CHASE · 1 STREAM · {thumbs.length} MORE ([ ] TO CYCLE)</p>
      ) : (
      <div className="stream-grid">
        {thumbs.map((s) => {
          const at = refreshedAt[s.id]
          const src = snapshotSource(resolutions.get(s.id)?.videoId ?? rosterVideoIds.get(s.id), s.status, at)
          const isPlaying = playingNow.includes(s.id)
          return (
            // Thumbnails mount an iframe only after the user's WATCH press (ADR-0017); otherwise stills only (ADR-0013).
            <FeedSlot key={s.id} id={s.id} onVisible={setVisible}>
              <StreamTile
                title={s.title}
                index={sorted.indexOf(s)}
                watchUrl={s.watchUrl}
                inAoi={isInAoi(s, states)}
                context={s.context}
                ledStatus={ledFor(s.status)}
                liveKind={liveKind(s.status, 'videoId' in s.youtube)}
                playing={isPlaying}
                // Sound off. The press is the user gesture, so autoplay here is not autoplay on load.
                embedUrl={isPlaying ? withAutoplay(withSound(s.embedUrl, false), true) : undefined}
                onPlay={() => setPlaying((p) => startTile(p, s.id))}
                onStop={() => setPlaying((p) => stopTile(p, s.id))}
                onSelect={() => {
                  choose(s.id)
                  setPlaying((p) => stopTile(p, s.id))
                }}
                snapshot={{
                  src,
                  placeholder: snapshotPlaceholder(s.status),
                  ageLabel: src && at !== undefined ? snapshotAgeLabel(now - at) : undefined,
                  stale: at !== undefined && isSnapshotStale(now - at),
                }}
              />
            </FeedSlot>
          )
        })}
      </div>
      )}
      {/* Link-out only (WP-36): Spotter Network's positions may not be redisplayed, so nothing is fetched from it. */}
      <p className="streams-footer">
        <a className="btn-console" href={spotterMapUrl(bbox)} target="_blank" rel="noopener noreferrer">
          <Abbr term="SN" title="Spotter Network: chasers' shared GPS positions" />
          {' MAP ↗'}
        </a>
      </p>
    </Panel>
  )
}
