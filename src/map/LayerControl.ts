import type maplibregl from 'maplibre-gl'

const STORAGE_KEY = 'storm-chasers.layers'

interface Toggleable {
  id: string
  label: string
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
    const root = document.createElement('div')
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

    const head = document.createElement('div')
    head.textContent = 'Layers'
    Object.assign(head.style, {
      padding: '2px 10px 6px',
      color: 'var(--text)',
      borderBottom: '1px solid var(--border)',
      marginBottom: '4px',
    })
    root.append(head)

    for (const row of this.rows) root.append(this.buildRow(row))

    this.container = root
    this.applyAll()
    return root
  }

  onRemove(): void {
    this.container?.remove()
    this.container = null
    this.map = null
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
    btn.append(led, row.label)
    btn.addEventListener('click', () => this.toggle(row.id))
    this.leds.set(row.id, led)
    this.buttons.set(row.id, btn)
    return btn
  }

  private isOn(id: string): boolean {
    return this.visibility[id] !== false
  }

  private toggle(id: string): void {
    this.visibility = { ...this.visibility, [id]: !this.isOn(id) }
    writeVisibility(this.visibility)
    this.applyRow(id)
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
