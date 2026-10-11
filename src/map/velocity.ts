import type maplibregl from 'maplibre-gl'
import type { LngLat } from '../types'
import { formatUtcHHMM } from '../sources/radar/frames'
import { loadNexradSites, nearestSite, weatherWiseUrl, type NexradSite } from '../sources/nexrad/sites'
import { fetchRidgeMeta, isStale, siteValid, srvTileUrl, type RidgeMetaEntry } from '../sources/nexrad/srv'
import { useAoi } from '../state/aoi'
import type { MapLayer } from './layers'

const SOURCE_ID = 'velocity'
const OPACITY = 0.78 // INFLOW --map-radar-opacity; MapLibre paint needs a literal.
const REFRESH_MS = 120_000
const SITE_DEBOUNCE_MS = 1_000
const NARROW = '(max-width: 420px)'
const STALE_TITLE = 'Newest SRV scan is over 20 min old'

/** The radar's name as the readout shows it: ICAO (KFFC) in the lower 48, IEM id elsewhere. */
export function siteLabel(site: NexradSite): string {
  return site.lower48 ? `K${site.sid}` : site.sid
}

/** What the control shows. `label` is null until the site list has loaded. */
export interface VelocityView {
  label: string | null
  /** ISO scan time of the chosen site, or null before ridge_current has loaded. */
  valid: string | null
  linkUrl: string | null
}

export interface VelocityReadout {
  /** `SRV · KFFC`, or `SRV · ---` before a site is chosen. */
  label: string
  /** `15:18Z`, or `--:--Z` when the scan time is unknown. */
  time: string
  stale: boolean
}

/** Pure: the readout text and stale flag for a view at `nowMs`. */
export function velocityReadout(view: VelocityView, nowMs: number): VelocityReadout {
  const label = `SRV · ${view.label ?? '---'}`
  if (view.valid === null) return { label, time: '--:--Z', stale: false }
  return { label, time: formatUtcHHMM(Date.parse(view.valid)), stale: isStale(view.valid, nowMs) }
}

/**
 * Bottom-left readout for the SRV layer. Read-only: a plain box with no border or pointer (ADR-0012).
 * The WeatherWise link is the only interactive part (a console button with its own focus ring).
 * The control is mounted even when the layer is off, because the link is useful on its own.
 * On narrow screens the time is dropped first; the link never is (ADR-0014).
 */
class VelocityControl implements maplibregl.IControl {
  private readonly root = document.createElement('div')
  private readonly readout = document.createElement('span')
  private readonly glyph = document.createElement('span')
  private readonly label = document.createElement('span')
  private readonly time = document.createElement('span')
  private readonly link = document.createElement('a')
  private readonly narrow =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(NARROW) : null
  private view: VelocityView = { label: null, valid: null, linkUrl: null }

  constructor() {
    this.root.style.cssText =
      'display:flex;align-items:center;gap:8px;padding:4px 8px;background:var(--surface-scrim);' +
      'border:1px solid var(--border);font-family:var(--font-data);font-size:12px;color:var(--text);white-space:nowrap;'
    this.link.className = 'btn-console'
    this.link.target = '_blank'
    this.link.rel = 'noopener noreferrer'
    this.readout.append(this.glyph, this.label, this.time)
    this.root.append(this.readout, this.link)
  }

  onAdd(): HTMLElement {
    this.narrow?.addEventListener('change', this.onMedia)
    this.render()
    return this.root
  }

  onRemove(): void {
    this.narrow?.removeEventListener('change', this.onMedia)
    this.root.remove()
  }

  setView(view: VelocityView): void {
    this.view = view
    this.render()
  }

  private readonly onMedia = () => this.render()

  private render(): void {
    const r = velocityReadout(this.view, Date.now())
    this.glyph.textContent = r.stale ? '◐ ' : ''
    this.label.textContent = r.label
    this.time.textContent = ` · ${r.time}`
    this.time.style.display = this.narrow?.matches ? 'none' : ''
    // Stale is sand plus the ◐ glyph, never colour alone.
    this.readout.style.color = r.stale ? 'var(--status-stale)' : ''
    this.readout.title = r.stale ? STALE_TITLE : ''

    const url = this.view.linkUrl
    this.link.style.display = url ? '' : 'none'
    if (url) {
      this.link.href = url
      this.link.title = `Open ${this.view.label ?? 'radar'} velocity in WeatherWise`
    }
    this.link.textContent = 'WEATHERWISE ↗'
  }
}

interface LayerState {
  map: maplibregl.Map
  control: VelocityControl
  sites: NexradSite[] | null
  site: NexradSite | null
  meta: RidgeMetaEntry[] | null
  /** Set when the map is removed (StrictMode remounts): async callbacks then do nothing. */
  disposed: boolean
}

const states = new WeakMap<maplibregl.Map, LayerState>()

/**
 * Calls `onChange` once the AOI has been quiet for `delayMs`. The subscription and the pending timer
 * are both torn down when the map is removed, so a remounted map is not driven by stale listeners.
 */
export function followAoi(
  map: { once(type: 'remove', listener: () => void): unknown },
  subscribe: (listener: () => void) => () => void,
  onChange: () => void,
  delayMs: number,
): void {
  let timer: ReturnType<typeof setTimeout> | null = null
  const unsubscribe = subscribe(() => {
    if (timer !== null) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      onChange()
    }, delayMs)
  })
  map.once('remove', () => {
    unsubscribe()
    if (timer !== null) clearTimeout(timer)
    timer = null
  })
}

// Layer zoom range while no site is known. A layer outside its zoom range never requests tiles, so the
// source's empty `tiles` array is never used. Restored to the full range once a site is chosen.
const HIDDEN_BY_ZOOM = 24
const FULL_ZOOM_RANGE = 0

function aoiCentre(): LngLat {
  const b = useAoi.getState().bbox
  return [(b.west + b.east) / 2, (b.south + b.north) / 2]
}

function renderView(st: LayerState): void {
  const site = st.site
  st.control.setView({
    label: site ? siteLabel(site) : null,
    valid: site && st.meta ? siteValid(st.meta, site.sid) : null,
    linkUrl: site ? weatherWiseUrl(site) : null,
  })
}

/**
 * Follows the AOI centre to its nearest radar. Tiles are swapped only when the site changes, or on
 * a refresh (`bustKey` set), so the same site is re-requested rather than served from cache.
 */
function chooseSite(st: LayerState, bustKey?: number): void {
  if (st.disposed || !st.sites) return
  const site = nearestSite(st.sites, aoiCentre())
  if (!site) return
  if (site.sid !== st.site?.sid || bustKey !== undefined) {
    st.site = site
    const src = st.map.getSource(SOURCE_ID) as maplibregl.RasterTileSource | undefined
    src?.setTiles([srvTileUrl(site.sid, bustKey)])
    st.map.setLayerZoomRange(SOURCE_ID, FULL_ZOOM_RANGE, HIDDEN_BY_ZOOM)
  }
  renderView(st)
}

function loadSites(st: LayerState): void {
  // On failure the next refresh retries (loadNexradSites does not cache a failed fetch).
  loadNexradSites()
    .then((sites) => {
      if (st.disposed) return
      st.sites = sites
      chooseSite(st)
    })
    .catch(() => {})
}

async function refreshMeta(st: LayerState): Promise<void> {
  try {
    const meta = await fetchRidgeMeta()
    if (st.disposed) return
    st.meta = meta
    renderView(st)
  } catch {
    // Keep the last known scan time; the readout stays as it was.
  }
}

/** Single-site storm-relative velocity (N0S) from the radar nearest the AOI centre (WP-18). */
export const velocityLayer: MapLayer = {
  id: 'velocity',
  label: 'Velocity (SRV, nearest radar)',
  defaultVisible: false,
  add(map) {
    // The source and layer exist from the start so LayerControl can apply the stored visibility.
    // The layer starts outside its zoom range (see HIDDEN_BY_ZOOM) until the first site is chosen.
    map.addSource(SOURCE_ID, { type: 'raster', tiles: [], tileSize: 256 })
    map.addLayer({
      id: SOURCE_ID,
      type: 'raster',
      source: SOURCE_ID,
      minzoom: HIDDEN_BY_ZOOM,
      paint: { 'raster-opacity': OPACITY },
    })
    const control = new VelocityControl()
    map.addControl(control, 'bottom-left')
    const st: LayerState = { map, control, sites: null, site: null, meta: null, disposed: false }
    states.set(map, st)
    map.once('remove', () => {
      st.disposed = true
    })

    followAoi(map, (listener) => useAoi.subscribe(listener), () => chooseSite(st), SITE_DEBOUNCE_MS)
    loadSites(st)
    void refreshMeta(st)
  },
  refreshMs: REFRESH_MS,
  refresh(map) {
    const st = states.get(map)
    if (!st) return
    if (!st.sites) loadSites(st)
    chooseSite(st, Date.now())
    void refreshMeta(st)
  },
}
