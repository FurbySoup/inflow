// Shared domain types. Every source adapter normalizes into these; panels only consume these.

export type LngLat = [lng: number, lat: number]

export interface Bbox {
  west: number
  south: number
  east: number
  north: number
}

export type AlertSeverity = 'Extreme' | 'Severe' | 'Moderate' | 'Minor' | 'Unknown'

export interface Alert {
  id: string
  event: string // e.g. "Tornado Warning"
  severity: AlertSeverity
  headline: string
  areaDesc: string
  onset: string | null // ISO
  expires: string | null // ISO
  /** Polygon geometry when the alert is storm-based. Zone-based alerts (most watches) have null. */
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon | null
  /** Two-letter state codes parsed from affected UGC zones, used for AOI filtering when geometry is null. */
  states: string[]
  /** NWS `affectedZones` URLs (e.g. https://api.weather.gov/zones/county/GAC029); resolves zone-based alerts to shapes. */
  zones: string[]
  /** NWS impact-based tag: tornadoDamageThreat / flashFloodDamageThreat (CATASTROPHIC = Tornado/Flash Flood Emergency). */
  damageThreat: 'considerable' | 'catastrophic' | null
  /** "Particularly dangerous situation" in the product text (PDS watches and warnings). */
  pds: boolean
}

export interface LiveStream {
  id: string
  title: string
  /** Embed URL ready for an iframe (YouTube channel live_stream or video embed). */
  embedUrl: string
  /** States the chaser usually covers / is currently in; used for AOI relevance. */
  states: string[]
}

export type AudioKind = 'scanner' | 'ham' | 'cb'

export interface AudioFeed {
  id: string
  kind: AudioKind
  title: string
  /** Direct playable stream URL (<audio>) or null when only a link-out is permitted. */
  streamUrl: string | null
  /** Page to open in a new tab (e.g. WebSDR/KiwiSDR receiver preset to a frequency). */
  pageUrl: string | null
  location: LngLat | null
  states: string[]
}

export interface CameraFeed {
  id: string
  title: string
  location: LngLat
  /** Still image URL; panels refresh it on an interval. */
  snapshotUrl: string
  /** Optional HLS/MJPEG stream URL. */
  streamUrl: string | null
  state: string
}

export type StormReportKind = 'tornado' | 'hail' | 'wind'

export interface StormReport {
  id: string
  kind: StormReportKind
  time: string // ISO
  location: LngLat
  magnitude: string | null
  comments: string
}
