import type maplibregl from 'maplibre-gl'
import type { OutlookDay } from '../sources/spc/outlook'
import { isLayerOn, subscribeLayers } from './LayerControl'
import { getOutlookDay, getOutlookLoaded, outlookCaption, setOutlookDay, subscribeOutlookDay } from './outlookDay'

const LAYER_ID = 'spc-outlook'
const DAYS: OutlookDay[] = [1, 2, 3, 4, 5, 6, 7, 8]

// Same rule as LayerControl (ADR-0014): an open list would cover most of a small map, so start collapsed.
const SMALL_SCREEN = '(max-width: 900px), (max-height: 500px)'

function startCollapsed(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(SMALL_SCREEN).matches
}

/**
 * Day selector for the SPC outlook layer (D1–D8). Affordance: the 1…8 buttons; signifier: the ▸/▾ head and the
 * solid accent on the selected day; feedback: the layer repaints, and the caption shows the loaded validity window.
 * Hidden while the SPC Outlook layer is off. Look is inline tokens, like LayerControl.
 */
export class OutlookDayControl implements maplibregl.IControl {
  private root: HTMLDivElement | null = null
  private head: HTMLButtonElement | null = null
  private body: HTMLDivElement | null = null
  private caption: HTMLSpanElement | null = null
  private open = true
  private readonly buttons = new Map<OutlookDay, HTMLButtonElement>()
  private unsubscribers: Array<() => void> = []

  onAdd(): HTMLElement {
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
    })

    const body = document.createElement('div')
    body.id = 'outlook-day-list'
    body.setAttribute('role', 'group')
    body.setAttribute('aria-label', 'SPC outlook day')
    Object.assign(body.style, {
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: '4px',
      padding: '0 8px',
    })
    for (const day of DAYS) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'btn-console'
      btn.textContent = String(day)
      btn.setAttribute('aria-label', `Day ${day}`)
      btn.addEventListener('click', () => setOutlookDay(day))
      this.buttons.set(day, btn)
      body.append(btn)
    }
    const caption = document.createElement('span')
    Object.assign(caption.style, { padding: '0 4px' })
    body.append(caption)

    const head = document.createElement('button')
    head.type = 'button'
    // Same head as the Layers control: its class carries the hover and :focus-visible signifiers (ADR-0012).
    head.className = 'layer-ctrl-head'
    head.setAttribute('aria-controls', body.id)
    head.addEventListener('click', () => this.setOpen(!this.open))

    root.append(head, body)
    this.root = root
    this.head = head
    this.body = body
    this.caption = caption
    this.setOpen(!startCollapsed())
    this.unsubscribers = [subscribeLayers(() => this.refresh()), subscribeOutlookDay(() => this.refresh())]
    this.refresh()
    return root
  }

  onRemove(): void {
    for (const unsubscribe of this.unsubscribers) unsubscribe()
    this.unsubscribers = []
    this.root?.remove()
    this.root = null
    this.head = null
    this.body = null
    this.caption = null
    this.buttons.clear()
  }

  private setOpen(open: boolean): void {
    this.open = open
    if (this.body) this.body.hidden = !open
    this.head?.setAttribute('aria-expanded', String(open))
    if (this.root) this.root.style.padding = open ? '6px 0' : '0'
    this.refresh()
  }

  private refresh(): void {
    if (!this.root) return
    const day = getOutlookDay()
    // The layer switch owns visibility: a hidden layer has no day to pick.
    this.root.hidden = !isLayerOn(LAYER_ID)
    for (const [n, btn] of this.buttons) btn.setAttribute('aria-pressed', String(n === day))
    if (this.head) this.head.textContent = `${this.open ? '▾' : '▸'} SPC D${day}`
    if (this.caption) this.caption.textContent = outlookCaption(day, getOutlookLoaded())
  }
}
