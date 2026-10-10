import { useEffect, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import type { CameraFeed } from '../types'
import type { SourceAdapter } from '../sources/types'
import { kansasCameras, nebraskaCameras } from '../sources/cars/adapter'
import { isTxdotFeed, txdotCameras } from '../sources/txdot/adapter'
import { fetchSnapshotDataUrl } from '../sources/txdot/snapshot'
import { useAoi } from '../state/aoi'
import { queryStatus, type FeedStatus } from '../lib/feedStatus'
import { Panel } from './Panel'

type CameraAdapter = SourceAdapter<unknown, CameraFeed> & { state: string }

// Append a new DOT camera adapter here.
// eslint-disable-next-line react-refresh/only-export-components -- adapters are appended to this list
export const CAMERA_ADAPTERS: CameraAdapter[] = [kansasCameras, nebraskaCameras, txdotCameras]

const MAX_TILES = 12
const REFRESH_MS = 60_000
const NO_COVERAGE = 'NO DOT CAMERA COVERAGE IN AOI — KS · NE · TX'

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
  gap: 6,
} as const

const tileStyle = {
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
  padding: 0,
  cursor: 'pointer',
  textAlign: 'left',
  color: 'var(--text)',
  background: 'var(--panel-head)',
  border: '1px solid var(--border)',
} as const

const imgStyle = {
  display: 'block',
  width: '100%',
  aspectRatio: '4 / 3',
  objectFit: 'cover',
  background: 'var(--bg)',
} as const

const captionStyle = {
  padding: '3px 5px',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
  fontFamily: 'var(--font-data)',
  fontSize: '0.68rem',
  color: 'var(--muted)',
} as const

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

// Returns an <img>-ready src. TxDOT snapshots are JSON with base64 inside, so they are fetched and decoded
// first; the last decoded frame stays up while the next one loads. A failed frame is hidden, and the next
// refresh tick produces a new URL and retries.
function useSnapshot(cam: CameraFeed, tick: number) {
  const url = withCacheBuster(cam.snapshotUrl, tick)
  const decoded = isTxdotFeed(cam)
  const [loaded, setLoaded] = useState<string | null>(null)
  const [failedUrl, setFailedUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!decoded) return
    const ctrl = new AbortController()
    fetchSnapshotDataUrl(url, ctrl.signal)
      .then((src) => setLoaded(src))
      .catch(() => {
        if (!ctrl.signal.aborted) setFailedUrl(url)
      })
    return () => ctrl.abort()
  }, [decoded, url])

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
  const { src, failed, fail } = useSnapshot(cam, tick)
  if (failed) return null
  return (
    <button type="button" style={tileStyle} title={cam.title} onClick={() => onOpen(cam.id)}>
      {src ? (
        <img src={src} alt={cam.title} loading="lazy" style={imgStyle} onError={fail} />
      ) : (
        <div style={imgStyle} aria-label={cam.title} />
      )}
      <span style={captionStyle}>{cam.title}</span>
    </button>
  )
}

function ExpandedCamera({ cam, tick, onClose }: { cam: CameraFeed; tick: number; onClose: () => void }) {
  const { src, failed, fail } = useSnapshot(cam, tick)
  if (failed) return null
  return (
    <figure style={{ margin: '0 0 8px' }}>
      {src ? (
        <img
          src={src}
          alt={cam.title}
          style={{ ...imgStyle, aspectRatio: '16 / 9', objectFit: 'contain', border: '1px solid var(--border)' }}
          onClick={onClose}
          onError={fail}
        />
      ) : (
        <div style={{ ...imgStyle, aspectRatio: '16 / 9', border: '1px solid var(--border)' }} />
      )}
      <figcaption style={{ ...captionStyle, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <span>{cam.title}</span>
        <button type="button" className="muted" onClick={onClose}>
          CLOSE
        </button>
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
    queries: CAMERA_ADAPTERS.map((a) => ({
      queryKey: [a.id, bbox],
      queryFn: async ({ signal }: { signal: AbortSignal }) =>
        a.normalize(await a.fetch(bbox, signal)),
      refetchInterval: a.refreshMs,
      placeholderData: (prev: CameraFeed[] | undefined) => prev,
      enabled: states.includes(a.state),
    })),
  })

  const covered = CAMERA_ADAPTERS.map((a, i) => ({ state: a.state, query: results[i] })).filter(
    (r) => states.includes(r.state),
  )

  if (covered.length === 0) {
    return (
      <Panel code="CCTV-01" title="DOT Cameras" status="offline">
        <p className="muted">{NO_COVERAGE}</p>
      </Panel>
    )
  }

  const status: FeedStatus = queryStatus({
    isPending: covered.some((r) => r.query.isPending),
    isError: covered.every((r) => r.query.isError),
  })

  const cameras = covered.flatMap((r) => r.query.data ?? [])
  // Nearest to the AOI centre first.
  const cx = (bbox.west + bbox.east) / 2
  const cy = (bbox.south + bbox.north) / 2
  const dist = (c: CameraFeed) => (c.location[0] - cx) ** 2 + (c.location[1] - cy) ** 2
  const tiles = [...cameras].sort((a, b) => dist(a) - dist(b)).slice(0, MAX_TILES)
  const expanded = openId ? cameras.find((c) => c.id === openId) : undefined

  const onOpen = (id: string) => setOpenId((cur) => (cur === id ? null : id))

  return (
    <Panel code="CCTV-01" title="DOT Cameras" status={status} meta={tiles.length}>
      {status === 'error' && <p className="error">Camera feeds unavailable</p>}
      {expanded && <ExpandedCamera cam={expanded} tick={tick} onClose={() => setOpenId(null)} />}
      {tiles.length > 0 ? (
        <div style={gridStyle}>
          {tiles.map((c) => (
            <CameraTile key={c.id} cam={c} tick={tick} onOpen={onOpen} />
          ))}
        </div>
      ) : (
        status === 'live' && <p className="muted">NO CAMERAS IN VIEW</p>
      )}
      <p className="muted" style={{ marginTop: 8 }}>
        Snapshots: KanDrive (KS) · Nebraska 511 (NE) · TxDOT (TX)
      </p>
    </Panel>
  )
}
