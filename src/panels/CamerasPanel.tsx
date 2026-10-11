import { useEffect, useRef, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import type { CameraFeed } from '../types'
import type { SourceAdapter } from '../sources/types'
import { kansasCameras, nebraskaCameras } from '../sources/cars/adapter'
import { southCarolinaCameras } from '../sources/sc511/adapter'
import { isTxdotFeed, txdotCameras } from '../sources/txdot/adapter'
import { floridaCameras, georgiaCameras } from '../sources/ibi511/adapter'
import { fetchSnapshotDataUrl } from '../sources/txdot/snapshot'
import { useAoi } from '../state/aoi'
import { queryStatus, type FeedState, type FeedStatus } from '../lib/feedStatus'
import { Panel } from './Panel'
import { CameraTile as UiCameraTile, ConsoleButton } from '../ui'

/** One DOT camera feed: its adapter, the states it covers (the panel only queries it while the AOI touches one), and its credit. */
interface CameraSource {
  adapter: SourceAdapter<unknown, CameraFeed>
  states: string[]
  /** Upstream name shown in the footer, e.g. "KanDrive". */
  attribution: string
}

// Append a new DOT camera source here. Coverage and footer texts are derived from this list.
// eslint-disable-next-line react-refresh/only-export-components -- sources are appended to this list
export const CAMERA_SOURCES: CameraSource[] = [
  { adapter: kansasCameras, states: ['KS'], attribution: 'KanDrive' },
  { adapter: nebraskaCameras, states: ['NE'], attribution: 'Nebraska 511' },
  { adapter: txdotCameras, states: ['TX'], attribution: 'TxDOT' },
  { adapter: georgiaCameras, states: ['GA'], attribution: '511GA' },
  { adapter: floridaCameras, states: ['FL'], attribution: 'FL511' },
  { adapter: southCarolinaCameras, states: ['SC'], attribution: '511SC' },
]

/** "NO DOT CAMERA COVERAGE IN AOI — COVERED: FL · GA · …" built from the source list. */
function noCoverageText(sources: readonly CameraSource[]): string {
  const covered = [...new Set(sources.flatMap((s) => s.states))].sort()
  return `NO DOT CAMERA COVERAGE IN AOI — COVERED: ${covered.join(' · ')}`
}

const MAX_TILES = 12
const REFRESH_MS = 60_000

// Snapshot URLs may already carry a query string (e.g. ?1791658260000).
function withCacheBuster(url: string, tick: number) {
  return `${url}${url.includes('?') ? '&' : '?'}t=${tick}`
}

function useRefreshTick(ms: number) {
  const [tick, setTick] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), ms)
    return () => clearInterval(id)
  }, [ms])
  return tick
}

// Tracks whether an element is in the viewport (clipping by scroll containers is handled by the browser).
// Without IntersectionObserver, everything counts as visible.
function useInView<T extends Element>() {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(() => typeof IntersectionObserver === 'undefined')
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const obs = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting))
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return { ref, inView }
}

// Returns an <img>-ready src. TxDOT snapshots are JSON with base64 inside, so they are fetched and decoded
// first, and only while visible; the last decoded frame stays up while the next one loads. A failed frame
// is hidden, and the next refresh tick produces a new URL and retries. KS/NE feeds are plain <img> URLs.
function useSnapshot(cam: CameraFeed, tick: number, visible: boolean) {
  const url = withCacheBuster(cam.snapshotUrl, tick)
  const decoded = isTxdotFeed(cam)
  const [loaded, setLoaded] = useState<string | null>(null)
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const loadedUrl = useRef<string | null>(null)

  useEffect(() => {
    if (!decoded || !visible || loadedUrl.current === url) return
    const ctrl = new AbortController()
    fetchSnapshotDataUrl(url)
      .then((src) => {
        if (!ctrl.signal.aborted) {
          loadedUrl.current = url
          setLoaded(src)
        }
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setFailedUrl(url)
      })
    return () => ctrl.abort()
  }, [decoded, url, visible])

  return {
    src: decoded ? loaded : url,
    failed: failedUrl === url,
    fail: () => setFailedUrl(url),
  }
}

function CameraTile({
  cam,
  tick,
  onOpen,
}: {
  cam: CameraFeed
  tick: number
  onOpen: (id: string) => void
}) {
  const { ref, inView } = useInView<HTMLButtonElement>()
  const { src, failed, fail } = useSnapshot(cam, tick, inView)
  if (failed) return null
  return <UiCameraTile ref={ref} title={cam.title} src={src} onOpen={() => onOpen(cam.id)} onError={fail} />
}

function ExpandedCamera({ cam, tick, onClose }: { cam: CameraFeed; tick: number; onClose: () => void }) {
  // The expanded view is on screen by definition, so it is always visible.
  const { src, failed, fail } = useSnapshot(cam, tick, true)
  if (failed) return null
  return (
    <figure style={{ margin: '0 0 8px' }}>
      {src ? (
        <img
          src={src}
          alt={cam.title}
          className="cam-tile-img"
          style={{ aspectRatio: '16 / 9', objectFit: 'contain', border: '1px solid var(--border)' }}
          onClick={onClose}
          onError={fail}
        />
      ) : (
        <div className="cam-tile-img" style={{ aspectRatio: '16 / 9', border: '1px solid var(--border)' }} />
      )}
      <figcaption className="cam-tile-caption" style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <span>{cam.title}</span>
        <ConsoleButton variant="quiet" onClick={onClose}>
          CLOSE
        </ConsoleButton>
      </figcaption>
    </figure>
  )
}

export function CamerasPanel() {
  const bbox = useAoi((s) => s.bbox)
  const states = useAoi((s) => s.states)
  const tick = useRefreshTick(REFRESH_MS)
  const [openId, setOpenId] = useState<string | null>(null)

  // Adapters with no state in the AOI are disabled, so they make no request.
  const results = useQueries({
    queries: CAMERA_SOURCES.map(({ adapter: a, states: covers }) => ({
      queryKey: [a.id, bbox],
      queryFn: async ({ signal }: { signal: AbortSignal }) =>
        a.normalize(await a.fetch(bbox, signal)),
      refetchInterval: a.refreshMs,
      placeholderData: (prev: CameraFeed[] | undefined) => prev,
      enabled: covers.some((st) => states.includes(st)),
    })),
  })

  const covered = CAMERA_SOURCES.map((source, i) => ({ source, query: results[i] })).filter((r) =>
    r.source.states.some((st) => states.includes(st)),
  )

  if (covered.length === 0) {
    return (
      <Panel collapsible code="CCTV-01" title="DOT Cameras" status="offline">
        <p className="muted">{noCoverageText(CAMERA_SOURCES)}</p>
      </Panel>
    )
  }

  const status: FeedStatus = queryStatus({
    isPending: covered.some((r) => r.query.isPending),
    isError: covered.every((r) => r.query.isError),
  })
  // Header age (WP-20): newest successful camera-list fetch across the covering adapters.
  const updatedAt = Math.max(0, ...covered.map((r) => r.query.dataUpdatedAt))
  const feed: FeedState = { status, refreshMs: REFRESH_MS, ...(updatedAt > 0 ? { updatedAt } : {}) }

  const cameras = covered.flatMap((r) => r.query.data ?? [])
  // Nearest to the AOI centre first.
  const cx = (bbox.west + bbox.east) / 2
  const cy = (bbox.south + bbox.north) / 2
  const dist = (c: CameraFeed) => (c.location[0] - cx) ** 2 + (c.location[1] - cy) ** 2
  const tiles = [...cameras].sort((a, b) => dist(a) - dist(b)).slice(0, MAX_TILES)
  const expanded = openId ? cameras.find((c) => c.id === openId) : undefined

  const onOpen = (id: string) => setOpenId((cur) => (cur === id ? null : id))

  return (
    <Panel collapsible code="CCTV-01" title="DOT Cameras" status={feed} meta={tiles.length}>
      {status === 'error' && <p className="error">Camera feeds unavailable</p>}
      {expanded && <ExpandedCamera cam={expanded} tick={tick} onClose={() => setOpenId(null)} />}
      {tiles.length > 0 ? (
        <div className="cam-grid">
          {tiles.map((c) => (
            <CameraTile key={c.id} cam={c} tick={tick} onOpen={onOpen} />
          ))}
        </div>
      ) : (
        status === 'live' && <p className="muted">NO CAMERAS IN VIEW</p>
      )}
      <p className="muted" style={{ marginTop: 8 }}>
        Snapshots: {covered.map((r) => `${r.source.attribution} (${r.source.states.join('/')})`).join(' · ')}
      </p>
    </Panel>
  )
}
