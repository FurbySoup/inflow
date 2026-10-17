import { useMemo } from 'react'

import { useMyChasers, type MyChaser } from '../../state/myChasers'
import { ROSTER, type Chaser } from './roster'

// The chaser list the app follows: the verified roster, then the viewer's own channels (WP-48). A viewer's
// chaser is a plain chaser with no regions; its states are the home states they picked.

/** A viewer-added channel as a roster-shaped chaser. */
export function toChaser(my: MyChaser): Chaser {
  return {
    id: 'my-' + my.channelId,
    name: my.name,
    handle: my.handle,
    channelId: my.channelId,
    kind: 'chaser',
    regions: [],
    states: my.states,
  }
}

/** Roster first, then the viewer's channels that are not already on the roster (by channelId). */
export function mergeChasers(roster: readonly Chaser[], mine: readonly MyChaser[]): Chaser[] {
  const known = new Set(roster.map((c) => c.channelId))
  const extra = mine.filter((m) => !known.has(m.channelId)).map(toChaser)
  return [...roster, ...extra]
}

/** The merged list, memoised on the store's list so consumers re-render only when it changes. */
export function useAllChasers(): readonly Chaser[] {
  const mine = useMyChasers((s) => s.chasers)
  return useMemo(() => mergeChasers(ROSTER, mine), [mine])
}
