import { useEffect, useState } from 'react'

import { snapshotsDue } from './snapshot'

/** How often due stills are checked; a still lands at most this long after its 60 s interval. */
const CHECK_MS = 5_000

export interface SnapshotClock {
  /** Current time, updated every check for the THUMB age labels. */
  now: number
  /** When each feed's still was last fetched (ms). Absent until the feed has been on screen. */
  refreshedAt: Readonly<Record<string, number>>
}

/**
 * Checks every 5 s and stamps a fresh still for each on-screen feed that is due (every 60 s; a feed
 * that has just come on screen is due at once). Off-screen feeds keep their last still, so their
 * label turns stale. Refreshes only happen for feeds in `onScreen`.
 */
export function useSnapshotClock(onScreen: ReadonlySet<string>): SnapshotClock {
  const [now, setNow] = useState(() => Date.now())
  const [refreshedAt, setRefreshedAt] = useState<Record<string, number>>({})

  useEffect(() => {
    const timer = window.setInterval(() => {
      const t = Date.now()
      setNow(t)
      setRefreshedAt((prev) => {
        const due = snapshotsDue(onScreen, prev, t)
        if (due.length === 0) return prev
        const next = { ...prev }
        for (const id of due) next[id] = t
        return next
      })
    }, CHECK_MS)
    return () => window.clearInterval(timer)
  }, [onScreen])

  return { now, refreshedAt }
}
