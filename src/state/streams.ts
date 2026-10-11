import { create } from 'zustand'
import { loadPrimaryId, savePrimaryId } from '../sources/streams/layout'

// Primary-feed selection, shared so controls outside the feeds panel (keyboard shortcuts, WP-17)
// can change it. StreamsGrid owns the ordering and publishes it here; nobody else computes it.
interface StreamsState {
  /** The user's stored choice (persisted). May be a feed that is currently not live. */
  primaryId: string | null
  /** Feed ids in display order, primary first, as last rendered by StreamsGrid. */
  order: string[]
  setPrimary: (id: string) => void
  setOrder: (ids: string[]) => void
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
  order: [],
  setPrimary: (id) => {
    savePrimaryId(id)
    set({ primaryId: id })
  },
  setOrder: (ids) => {
    const prev = get().order
    if (prev.length === ids.length && prev.every((id, i) => id === ids[i])) return
    set({ order: ids })
  },
  cyclePrimary: (dir) => {
    const { order } = get()
    // order[0] is the primary actually shown (the stored id may be ENDED and not in the main slot).
    const next = stepPrimary(order, order[0] ?? null, dir)
    if (next !== null) get().setPrimary(next)
  },
}))
