import { create } from 'zustand'
import { loadPrimaryId, savePrimaryId } from '../sources/streams/layout'

// Primary-feed selection, shared so controls outside the feeds panel (keyboard shortcuts, WP-17)
// can change it. StreamsGrid owns the ordering and publishes it here; nobody else computes it.
interface StreamsState {
  /** The user's stored choice (persisted). May be a feed that is currently not live. */
  primaryId: string | null
  /** True once the user picks a feed in this session; a remembered pick from an earlier session is false. */
  chosenThisSession: boolean
  /** Feed ids in sorted order (live first), as last rendered by StreamsGrid. Stable while cycling. */
  order: string[]
  /** The feed actually in the main slot (may differ from primaryId when a remembered pick has ended). */
  shownId: string | null
  setPrimary: (id: string) => void
  setOrder: (ids: string[], shownId: string | null) => void
  /** Makes the next (1) or previous (-1) feed in display order the primary, wrapping around. */
  cyclePrimary: (dir: 1 | -1) => void
}

/** Pure: the id `dir` steps from `current` in `order`, wrapping; null for an empty order. */
export function stepPrimary(order: string[], current: string | null, dir: 1 | -1): string | null {
  if (order.length === 0) return null
  const i = current === null ? -1 : order.indexOf(current)
  if (i === -1) return order[0]
  return order[(i + dir + order.length) % order.length]
}

export const useStreams = create<StreamsState>((set, get) => ({
  primaryId: loadPrimaryId(),
  chosenThisSession: false,
  order: [],
  shownId: null,
  setPrimary: (id) => {
    savePrimaryId(id)
    set({ primaryId: id, chosenThisSession: true })
  },
  setOrder: (ids, shownId) => {
    const prev = get()
    const same = prev.order.length === ids.length && prev.order.every((id, i) => id === ids[i])
    if (same && prev.shownId === shownId) return
    set(same ? { shownId } : { order: ids, shownId })
  },
  cyclePrimary: (dir) => {
    const { order, shownId } = get()
    // Step through the sorted order (not primary-first display order, which would flip between two feeds).
    const next = stepPrimary(order, shownId, dir)
    if (next !== null) get().setPrimary(next)
  },
}))
