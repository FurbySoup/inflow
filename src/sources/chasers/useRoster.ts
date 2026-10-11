import { useEffect, useSyncExternalStore } from 'react'

import { useAoi } from '../../state/aoi'
import { ROSTER } from './roster'
import { createScheduler, defaultDeps, type RosterScheduler, type RosterState } from './scheduler'

// One scheduler for the app, shared by every mount. It runs while at least one component uses the roster.
let scheduler: RosterScheduler | undefined
function get(): RosterScheduler {
  if (!scheduler) scheduler = createScheduler(defaultDeps(ROSTER, () => useAoi.getState().states))
  return scheduler
}
const subscribe = (listener: () => void) => get().subscribe(listener)
const getSnapshot = () => get().getState()

let users = 0

/** Roster liveness (WP-36). Panels never fetch: this only reads the scheduler's results. */
export function useRoster(): RosterState {
  useEffect(() => {
    users += 1
    get().start()
    return () => {
      users -= 1
      if (users === 0) get().stop()
    }
  }, [])
  return useSyncExternalStore(subscribe, getSnapshot)
}
