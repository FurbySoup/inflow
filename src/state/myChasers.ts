import { create } from 'zustand'

// Chasers the viewer added themselves (WP-48), on top of the verified roster in config/chasers.json. Per-browser,
// persisted to localStorage, so a self-hosted install can follow a new streamer without a rebuild. Entries are
// only ever created from a channel page YouTube itself resolved (never a typed-in ID), so they are as trustworthy
// as the roster's own verification method.

export const MY_CHASERS_KEY = 'storm-chasers.my-chasers.v1'
/** Keeps the liveness round-robin (one channel per 10 s, ADR-0013) from stretching past ~25 min a pass. */
export const MAX_MY_CHASERS = 100

export interface MyChaser {
  channelId: string
  /** Channel name as YouTube shows it. */
  name: string
  /** `@handle` when the channel has one, else ''. */
  handle: string
  /** Home states (USPS codes); [] = national, like the roster. */
  states: string[]
  /** Epoch ms when added. */
  addedAt: number
}

const CHANNEL_ID = /^UC[A-Za-z0-9_-]{22}$/
const STATE = /^[A-Z]{2}$/

function isMyChaser(v: unknown): v is MyChaser {
  if (typeof v !== 'object' || v === null) return false
  const c = v as Record<string, unknown>
  return (
    typeof c.channelId === 'string' &&
    CHANNEL_ID.test(c.channelId) &&
    typeof c.name === 'string' &&
    c.name.trim() !== '' &&
    typeof c.handle === 'string' &&
    Array.isArray(c.states) &&
    c.states.every((s) => typeof s === 'string' && STATE.test(s)) &&
    typeof c.addedAt === 'number'
  )
}

/** Parses the stored list, dropping malformed entries and duplicate channels. `read` is injected for tests. */
export function loadMyChasers(read: () => string | null = readStorage): MyChaser[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(read() ?? '[]')
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []
  const seen = new Set<string>()
  const out: MyChaser[] = []
  for (const v of parsed) {
    if (!isMyChaser(v) || seen.has(v.channelId)) continue
    seen.add(v.channelId)
    out.push({ channelId: v.channelId, name: v.name, handle: v.handle, states: [...v.states], addedAt: v.addedAt })
    if (out.length === MAX_MY_CHASERS) break
  }
  return out
}

function readStorage(): string | null {
  try {
    return localStorage.getItem(MY_CHASERS_KEY)
  } catch {
    return null
  }
}

function save(list: MyChaser[]): void {
  try {
    localStorage.setItem(MY_CHASERS_KEY, JSON.stringify(list))
  } catch {
    // Storage unavailable (private mode, quota): the list lasts for this session only.
  }
}

export type AddResult = 'added' | 'duplicate' | 'full' | 'invalid'

interface MyChasersState {
  chasers: MyChaser[]
  /** Adds a resolved channel. The caller rejects channels already in the verified roster (that is a `duplicate` too). */
  add: (chaser: MyChaser) => AddResult
  remove: (channelId: string) => void
}

export const useMyChasers = create<MyChasersState>((set, get) => ({
  chasers: loadMyChasers(),
  add: (chaser) => {
    if (!isMyChaser(chaser)) return 'invalid'
    const { chasers } = get()
    if (chasers.some((c) => c.channelId === chaser.channelId)) return 'duplicate'
    if (chasers.length >= MAX_MY_CHASERS) return 'full'
    const next = [...chasers, chaser]
    save(next)
    set({ chasers: next })
    return 'added'
  },
  remove: (channelId) => {
    const next = get().chasers.filter((c) => c.channelId !== channelId)
    save(next)
    set({ chasers: next })
  },
}))
