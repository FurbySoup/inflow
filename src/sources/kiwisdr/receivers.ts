import type { AudioFeed, LngLat } from '../../types'
import type { SourceAdapter } from '../types'

// Plain HTTP directory with no CORS: reached through the dev proxy (ADR-0005).
const DIRECTORY_URL = '/api/kiwisdr/kiwisdr_com.js'

/** 27.185 MHz, CB channel 19 (AM). */
export const CB19_HZ = 27_185_000
/** 144 MHz, start of the 2 m band. */
export const TWO_M_HZ = 144_000_000

export interface KiwiReceiver {
  id: string
  name: string
  /** Receiver base URL (plain http), no trailing slash. */
  url: string
  /** [lng, lat] */
  location: LngLat
  /** Tuning range in Hz, inclusive. */
  bands: [number, number]
  users: number
  usersMax: number
}

interface RawReceiver {
  id: string
  name: string
  url: string
  gps: string
  bands: string
  offline: string
  users: string
  users_max: string
}

/**
 * The directory is a JS file (`var kiwisdr_com = [...]`) with every field as a string and a
 * trailing comma before `]`, which JSON.parse rejects. Strip both before parsing.
 */
export function parseDirectory(js: string): RawReceiver[] {
  const marker = js.indexOf('kiwisdr_com')
  const start = js.indexOf('[', marker)
  const end = js.lastIndexOf(']')
  if (marker < 0 || start < 0 || end < start) throw new Error('KiwiSDR directory: no array found')
  return JSON.parse(js.slice(start, end + 1).replace(/,\s*\]$/, ']'))
}

const GPS_RE = /^\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)$/
const BANDS_RE = /^(\d+)-(\d+)$/

function toReceiver(e: RawReceiver): KiwiReceiver[] {
  const gps = GPS_RE.exec(e.gps)
  const bands = BANDS_RE.exec(e.bands)
  if (e.offline === 'yes' || !gps || !bands) return []
  return [
    {
      id: e.id,
      name: e.name,
      url: e.url.replace(/\/+$/, ''),
      location: [Number(gps[2]), Number(gps[1])],
      bands: [Number(bands[1]), Number(bands[2])],
      users: Number(e.users) || 0,
      usersMax: Number(e.users_max) || 0,
    },
  ]
}

export function normalizeDirectory(js: string): KiwiReceiver[] {
  return parseDirectory(js).flatMap(toReceiver)
}

export const kiwisdrDirectory: SourceAdapter<string, KiwiReceiver> = {
  id: 'kiwisdr-directory',
  refreshMs: 30 * 60_000,
  async fetch(_aoi, signal) {
    const res = await fetch(DIRECTORY_URL, { signal })
    if (!res.ok) throw new Error(`KiwiSDR directory ${res.status}`)
    return res.text()
  },
  normalize: normalizeDirectory,
}

/** Great-circle distance in km. */
export function haversineKm(a: LngLat, b: LngLat): number {
  const rad = Math.PI / 180
  const dLat = (b[1] - a[1]) * rad
  const dLng = (b[0] - a[0]) * rad
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLng / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}

const covers = (r: KiwiReceiver, hz: number) => r.bands[0] <= hz && hz <= r.bands[1]

export interface NearReceiver {
  receiver: KiwiReceiver
  km: number
}

/** Nearest online receivers that cover 27 MHz, nearest first. */
export function nearestCbReceivers(
  receivers: KiwiReceiver[],
  centre: LngLat,
  count = 5,
): NearReceiver[] {
  return receivers
    .filter((r) => covers(r, CB19_HZ))
    .map((receiver) => ({ receiver, km: haversineKm(centre, receiver.location) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, count)
}

/** Link-out feeds for one receiver: CB 19 always (it covers 27 MHz), 2 m only when its range includes 144 MHz. */
export function receiverFeeds(r: KiwiReceiver): AudioFeed[] {
  const feeds: AudioFeed[] = [
    {
      id: `${r.id}-cb19`,
      kind: 'cb',
      title: `${r.name} · CB 19`,
      streamUrl: null,
      pageUrl: `${r.url}/?f=27185am`,
      location: r.location,
      states: [],
    },
  ]
  if (covers(r, TWO_M_HZ)) {
    feeds.push({
      id: `${r.id}-2m`,
      kind: 'ham',
      title: `${r.name} · 2M`,
      streamUrl: null,
      // No 2 m frequency is curated yet, so this opens the receiver without a preset.
      pageUrl: `${r.url}/`,
      location: r.location,
      states: [],
    })
  }
  return feeds
}
