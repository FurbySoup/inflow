import type { OutlookDay, OutlookWindow } from '../sources/spc/outlook'
import type { RiskCategory } from '../panels/spcRisk'

/** What the map last loaded, tagged with its day, so the control never captions one day with another's data. */
export interface LoadedOutlook {
  day: OutlookDay
  /** Null when the day carries no VALID stamp. */
  window: OutlookWindow | null
  /** Highest categorical LABEL over the whole outlook (Days 1–3), or null when there is none. */
  highest: RiskCategory | null
  /** LABEL of an empty Day 4–8 placeholder, e.g. `Predictability Too Low`; null when the day has polygons. */
  emptyLabel: string | null
}

// In memory only: the day resets to D1 on reload, as the layer does.
let day: OutlookDay = 1
let loaded: LoadedOutlook | null = null
let loading: OutlookDay | null = null
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

/** Called by the outlook layer after a successful load. Clears the loading flag when it was for this day. */
export function setOutlookLoaded(next: LoadedOutlook): void {
  loaded = next
  if (loading === next.day) loading = null
  notify()
}

/** The day whose request is in flight after a day change, or null. */
export function getOutlookLoading(): OutlookDay | null {
  return loading
}

export function setOutlookLoading(next: OutlookDay | null): void {
  if (next === loading) return
  loading = next
  notify()
}

/** Calls `listener` after the day, the loading day or the loaded outlook changes. Returns the unsubscribe. */
export function subscribeOutlookDay(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY_MS = 86_400_000

/** `Mon 12 Oct` for a UTC calendar day. */
export function utcDayLabel(date: Date): string {
  return `${WEEKDAYS[date.getUTCDay()]} ${String(date.getUTCDate()).padStart(2, '0')} ${MONTHS[date.getUTCMonth()]}`
}

/** The UTC day of an SPC `YYYYMMDDHHMM` stamp as `Mon 12 Oct`, or null for anything malformed. */
export function validDayLabel(valid: string): string | null {
  if (!/^\d{12}$/.test(valid)) return null
  const date = new Date(Date.UTC(Number(valid.slice(0, 4)), Number(valid.slice(4, 6)) - 1, Number(valid.slice(6, 8))))
  return utcDayLabel(date)
}

/** Day N's valid day counted from today's UTC date (D1 is today, D2 tomorrow), for titles before any data loads. */
export function expectedDayLabel(selected: OutlookDay, now: Date): string {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  return utcDayLabel(new Date(today + (selected - 1) * DAY_MS))
}

/**
 * The caption as plain text in `before`, plus the category word in `term` that the control tags with an acronym tip
 * (ADR-0018). `term` is null when the whole caption is plain text.
 */
export interface OutlookCaption {
  before: string
  term: string | null
}

/**
 * `D2 · MON 12 OCT · HIGHEST TSTM` for a loaded day with polygons, `D5 · THU 15 OCT · PREDICTABILITY TOO LOW` for an
 * empty one, `LOADING D3…` while that day is in flight, and `D3 · NOT LOADED` when nothing for it has arrived.
 */
export function outlookCaption(
  selected: OutlookDay,
  loadedOutlook: LoadedOutlook | null,
  loadingDay: OutlookDay | null,
): OutlookCaption {
  if (loadingDay === selected) return { before: `LOADING D${selected}…`, term: null }
  if (loadedOutlook?.day !== selected) return { before: `D${selected} · NOT LOADED`, term: null }

  const parts = [`D${selected}`]
  const date = loadedOutlook.window ? validDayLabel(loadedOutlook.window.valid) : null
  if (date) parts.push(date.toUpperCase())
  if (loadedOutlook.highest) {
    return { before: `${[...parts, 'HIGHEST'].join(' · ')} `, term: loadedOutlook.highest }
  }
  // An SPC empty-day label is a glossary term (the control tips it); our own NO POLYGONS is not.
  if (loadedOutlook.emptyLabel) {
    return { before: `${parts.join(' · ')} · `, term: loadedOutlook.emptyLabel.toUpperCase() }
  }
  return { before: [...parts, 'NO POLYGONS'].join(' · '), term: null }
}
