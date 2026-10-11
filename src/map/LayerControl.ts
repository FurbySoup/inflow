import type maplibregl from 'maplibre-gl'
import { expand } from '../ui'

const STORAGE_KEY = 'storm-chasers.layers'

/**
 * A layer label as DOM nodes (ADR-0018). Each word the glossary knows (GOES, IR, SPC, NEXRAD, SRV, NWS) becomes an
 * `abbr` with its expansion as the tip; the text itself is unchanged, so the row's name stays the label.
 */
export function labelNodes(label: string): Node[] {
  // Odd indices are the captured words; even indices are the text between them.
  const nodes: Node[] = []
  label.split(/\b([A-Z][A-Z0-9]*)\b/).forEach((part, i) => {
    if (part === '') return
    const tip = i % 2 === 1 ? expand(part) : undefined
    if (!tip) {
      nodes.push(document.createTextNode(part))
      return
    }
    const abbr = document.createElement('abbr')
    abbr.className = 'abbr'
    abbr.title = tip
    abbr.textContent = part
    nodes.push(abbr)
  })
  return nodes
}

interface Toggleable {
  id: string
  label: string
  /** Visibility when the user has no stored preference. Default true. */
  defaultVisible?: boolean
}

/** Drawn by MapPanel above the registry, so it is not in `mapLayers`. Both its style layers start with `alerts`. */
const NWS_ALERTS: Toggleable = { id: 'alerts', label: 'NWS Alerts' }

/** True when a MapLibre style layer belongs to an overlay: its id starts with the overlay id. */
export function layerMatches(styleLayerId: string, overlayId: string): boolean {
  // Exact id or `${id}-…` (ADR-0008 naming), so 'radar' never matches a future 'radarx'.
  return styleLayerId === overlayId || styleLayerId.startsWith(`${overlayId}-`)
}

function readVisibility(): Record<string, boolean> {
  const out: Record<string, boolean> = {}
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    if (typeof parsed !== 'object' || parsed === null) return out
    for (const [id, on] of Object.entries(parsed)) {
      if (typeof on === 'boolean') out[id] = on
    }
  } catch {
    // Storage unavailable or corrupt: fall back to every layer on.
  }
  return out
}

function writeVisibility(state: Record<string, boolean>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage unavailable: visibility still works for this session.
  }
}

const SMALL_SCREEN = '(max-width: 900px), (max-height: 500px)'

function startCollapsed(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(SMALL_SCREEN).matches
}

// The mounted control, so code without the DOM (keyboard shortcuts, WP-17) can toggle layers
// through the same path as a click: same persistence, same LED/aria feedback.
const mounted = new Set<LayerControl>()
const current = (): LayerControl | undefined => [...mounted].pop()

/** Overlay ids the control lists (registry layers + NWS alerts), in display order. Empty before the map loads. */
export function layerIds(): string[] {
  return current()?.ids() ?? []
}

/** Toggles an overlay as if its row were clicked. Returns false when no control is mounted or the id is unknown. */
export function toggleLayer(id: string): boolean {
  return current()?.toggleById(id) ?? false
}

const layerListeners = new Set<() => void>()
const notifyLayers = (): void => {
  for (const listener of layerListeners) listener()
}

/** Current visibility of an overlay. Without a mounted control it falls back to the stored preference (default on). */
export function isLayerOn(id: string): boolean {
  const control = current()
  if (control) return control.isOn(id)
  return readVisibility()[id] ?? true
}

/** Calls `listener` after every overlay visibility change (row click, keyboard toggle, mount, unmount). Returns the unsubscribe. */
export function subscribeLayers(listener: () => void): () => void {
  layerListeners.add(listener)
  return () => {
    layerListeners.delete(listener)
  }
}

/** Console-style layer switchboard. Each row toggles every style layer its overlay id prefixes. */
export class LayerControl implements maplibregl.IControl {
  private readonly rows: Toggleable[]
  private readonly leds = new Map<string, HTMLSpanElement>()
  private readonly buttons = new Map<string, HTMLButtonElement>()
  private visibility = readVisibility()
  private map: maplibregl.Map | null = null
  private container: HTMLDivElement | null = null

  constructor(layers: readonly Toggleable[]) {
    this.rows = [...layers, NWS_ALERTS]
  }

  onAdd(map: maplibregl.Map): HTMLElement {
    this.map = map
    mounted.add(this)
    const root = document.createElement('div')
    // MapLibre's corner containers are pointer-events:none; only .maplibregl-ctrl children get clicks back.
    root.className = 'maplibregl-ctrl'
    Object.assign(root.style, {
      background: 'var(--panel)',
      border: '1px solid var(--border)',
      fontFamily: 'var(--font-data)',
      fontSize: '0.72rem',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'var(--muted)',
      padding: '6px 0',
      minWidth: '180px',
    })

    // Collapsible header (ADR-0012 signifier: ▾/▸ glyph + aria-expanded). Starts collapsed on small
    // screens (ADR-0014), where an open list would cover most of the map.
    const list = document.createElement('div')
    list.id = 'layer-control-list'
    for (const row of this.rows) list.append(this.buildRow(row))

    const head = document.createElement('button')
    head.type = 'button'
    head.className = 'layer-ctrl-head'
    head.setAttribute('aria-controls', list.id)
    const setOpen = (open: boolean) => {
      list.hidden = !open
      head.setAttribute('aria-expanded', String(open))
      head.textContent = `${open ? '▾' : '▸'} Layers`
      root.style.padding = open ? '6px 0' : '0'
    }
    head.addEventListener('click', () => setOpen(list.hidden))
    root.append(head, list)
    setOpen(!startCollapsed())

    this.container = root
    this.applyAll()
    notifyLayers()
    return root
  }

  ids(): string[] {
    return this.rows.map((r) => r.id)
  }

  isOn(id: string): boolean {
    const stored = this.visibility[id]
    if (stored !== undefined) return stored
    return this.rows.find((r) => r.id === id)?.defaultVisible !== false
  }

  toggleById(id: string): boolean {
    if (!this.rows.some((r) => r.id === id)) return false
    this.toggle(id)
    return true
  }

  onRemove(): void {
    mounted.delete(this)
    this.container?.remove()
    this.container = null
    this.map = null
    notifyLayers()
  }

  private buildRow(row: Toggleable): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.type = 'button'
    Object.assign(btn.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      width: '100%',
      background: 'none',
      border: 'none',
      padding: '4px 10px',
      color: 'inherit',
      letterSpacing: 'inherit',
      textTransform: 'inherit',
      textAlign: 'left',
      cursor: 'pointer',
    })
    const led = document.createElement('span')
    led.className = 'led'
    btn.append(led, ...labelNodes(row.label))
    btn.addEventListener('click', () => this.toggle(row.id))
    this.leds.set(row.id, led)
    this.buttons.set(row.id, btn)
    return btn
  }

  private toggle(id: string): void {
    this.visibility = { ...this.visibility, [id]: !this.isOn(id) }
    writeVisibility(this.visibility)
    this.applyRow(id)
    notifyLayers()
  }

  private applyAll(): void {
    for (const row of this.rows) this.applyRow(row.id)
  }

  private applyRow(id: string): void {
    const on = this.isOn(id)
    const led = this.leds.get(id)
    if (led) led.className = on ? 'led led-live' : 'led'
    this.buttons.get(id)?.setAttribute('aria-pressed', String(on))
    if (!this.map) return
    for (const layer of this.map.getStyle().layers) {
      if (layerMatches(layer.id, id)) {
        this.map.setLayoutProperty(layer.id, 'visibility', on ? 'visible' : 'none')
      }
    }
  }
}
