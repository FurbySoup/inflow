import { useEffect, useState } from 'react'

import { snapshotsDue } from './snapshot'

export interface SnapshotClock {
  /** Current time, updated every second for the SNAP age labels. */
  now: number
  /** When each feed's still was last taken (ms). Absent until the feed has been on screen. */
  refreshedAt: Readonly<Record<string, number>>
}

/**
 * Ticks once a second. Stamps a fresh still for every on-screen feed that is due (every 15 s, and at
 * once when a feed first comes on screen, within a second). Off-screen feeds keep their last still,
 * so their age keeps growing. Refreshes only happen for feeds in `onScreen` (ADR-0013 budget).
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
    }, 1000)
    return () => window.clearInterval(timer)
  }, [onScreen])

  return { now, refreshedAt }
}
