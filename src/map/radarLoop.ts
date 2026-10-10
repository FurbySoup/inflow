import type maplibregl from 'maplibre-gl'
import {
  FRAME_OFFSETS_MIN,
  formatUtcHHMM,
  frameSourceId,
  frameTimeMs,
} from '../sources/radar/frames'

const FRAME_MS = 500
const HOLD_MS = 1500
const FRAME_OPACITY = 0.7
const LAST = FRAME_OFFSETS_MIN.length - 1

/**
 * Play/pause + frame time control for the radar frame stack. Frames are raster layers whose
 * sources are created by `radarLayer.add`; this control only toggles their opacity.
 */
export class RadarLoopControl implements maplibregl.IControl {
  private map: maplibregl.Map | null = null
  private root: HTMLDivElement | null = null
  private playBtn: HTMLButtonElement | null = null
  private timeEl: HTMLSpanElement | null = null
  private liveEl: HTMLSpanElement | null = null
  private index = LAST
  private validMs: number | null = null
  private playing = false
  private timer: ReturnType<typeof setTimeout> | null = null

  onAdd(map: maplibregl.Map): HTMLElement {
    this.map = map
    const root = document.createElement('div')
    root.style.cssText =
      'display:flex;align-items:center;gap:8px;padding:4px 8px;background:var(--panel);' +
      'border:1px solid var(--border);font-family:var(--font-data);font-size:12px;color:var(--text);'

    const playBtn = document.createElement('button')
    playBtn.type = 'button'
    playBtn.style.cssText =
      'background:none;border:1px solid var(--border);color:var(--accent);cursor:pointer;' +
      'font:inherit;padding:0 6px;line-height:20px;min-width:28px;'
    playBtn.addEventListener('click', () => (this.playing ? this.pause() : this.play()))

    const timeEl = document.createElement('span')
    const liveEl = document.createElement('span')
    liveEl.textContent = 'LIVE'
    liveEl.style.cssText = 'color:var(--live);letter-spacing:0.08em;'

    root.append(playBtn, timeEl, liveEl)
    this.root = root
    this.playBtn = playBtn
    this.timeEl = timeEl
    this.liveEl = liveEl

    this.show(this.index)
    this.render()
    return root
  }

  onRemove(): void {
    this.pause()
    this.root?.remove()
    this.root = null
    this.playBtn = null
    this.timeEl = null
    this.liveEl = null
    this.map = null
  }

  /** Sets the valid time of the newest frame (epoch ms). Other frame times derive from it. */
  setValidTime(validMs: number): void {
    this.validMs = validMs
    this.render()
  }

  private play(): void {
    if (this.playing) return
    if (this.index === LAST) this.show(0)
    this.playing = true
    this.scheduleNext()
    this.render()
  }

  private pause(): void {
    this.playing = false
    if (this.timer !== null) clearTimeout(this.timer)
    this.timer = null
    this.render()
  }

  private scheduleNext(): void {
    const wait = FRAME_MS + (this.index === LAST ? HOLD_MS : 0)
    this.timer = setTimeout(() => this.tick(), wait)
  }

  private tick(): void {
    this.timer = null
    if (!this.playing) return
    this.show((this.index + 1) % FRAME_OFFSETS_MIN.length)
    this.scheduleNext()
  }

  private show(i: number): void {
    this.index = i
    const map = this.map
    if (map) {
      FRAME_OFFSETS_MIN.forEach((offset, j) => {
        const id = frameSourceId(offset)
        if (map.getLayer(id)) {
          map.setPaintProperty(id, 'raster-opacity', j === i ? FRAME_OPACITY : 0)
        }
      })
    }
    this.render()
  }

  private render(): void {
    if (!this.playBtn || !this.timeEl || !this.liveEl) return
    this.playBtn.textContent = this.playing ? '❚❚' : '▶'
    this.playBtn.setAttribute('aria-label', this.playing ? 'Pause radar loop' : 'Play radar loop')
    this.timeEl.textContent =
      this.validMs === null
        ? '--:--Z'
        : formatUtcHHMM(frameTimeMs(this.validMs, FRAME_OFFSETS_MIN[this.index]))
    this.liveEl.style.display = this.index === LAST ? '' : 'none'
  }
}
