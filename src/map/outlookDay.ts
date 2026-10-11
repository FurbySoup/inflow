import type { OutlookDay, OutlookWindow } from '../sources/spc/outlook'

/** What the map last loaded, tagged with its day, so the control never captions one day with another's window. */
export interface LoadedOutlook {
  day: OutlookDay
  window: OutlookWindow | null
}

// In memory only: the day resets to D1 on reload, as the layer does.
let day: OutlookDay = 1
let loaded: LoadedOutlook | null = null
const listeners = new Set<() => void>()

const notify = (): void => {
  for (const listener of listeners) listener()
}

export function getOutlookDay(): OutlookDay {
  return day
}

export function setOutlookDay(next: OutlookDay): void {
  if (next === day) return
  day = next
  notify()
}

export function getOutlookLoaded(): LoadedOutlook | null {
  return loaded
}

/** Called by the outlook layer after a successful load. */
export function setOutlookLoaded(next: LoadedOutlook): void {
  loaded = next
  notify()
}

/** Calls `listener` after the day or the loaded window changes. Returns the unsubscribe. */
export function subscribeOutlookDay(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** `DDHHMM` from a raw `YYYYMMDDHHMM` SPC timestamp. */
const dayHourMinute = (raw: string): string => raw.slice(6, 12)

/** `SPC D1 · VALID 111630Z–121200Z` for the loaded day, or `SPC D4 · —` while that day is not loaded or has no polygons. */
export function outlookCaption(selected: OutlookDay, loadedOutlook: LoadedOutlook | null): string {
  const w = loadedOutlook?.day === selected ? loadedOutlook.window : null
  const tail = w ? `VALID ${dayHourMinute(w.valid)}Z–${dayHourMinute(w.expire)}Z` : '—'
  return `SPC D${selected} · ${tail}`
}
