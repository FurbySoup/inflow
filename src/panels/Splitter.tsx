import type { KeyboardEvent, PointerEvent } from 'react'
import { useLayout, type LayoutSizes } from '../state/layout'

interface SplitterProps {
  /** Which layout size this handle controls. */
  target: keyof LayoutSizes
  /** CSS grid area name. */
  area: string
}

const KEY_STEP = 16
const CONSOLE_KEY_STEP = 0.02

/**
 * Drag handle between grid tracks. Both controlled tracks sit on the far side of the handle
 * (feeds column to the right, console row below), so dragging toward them shrinks them.
 */
export function Splitter({ target, area }: SplitterProps) {
  const value = useLayout((s) => s[target])
  const setSize = useLayout((s) => s.setSize)
  const reset = useLayout((s) => s.reset)
  const vertical = target === 'sideWidth' // vertical bar, drags horizontally

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    const el = e.currentTarget
    el.setPointerCapture(e.pointerId)
    const start = vertical ? e.clientX : e.clientY
    const startValue = value
    document.body.classList.add('resizing')

    const move = (ev: globalThis.PointerEvent) => {
      const delta = (vertical ? ev.clientX : ev.clientY) - start
      setSize(target, startValue - delta)
    }
    const up = () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
      document.body.classList.remove('resizing')
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const grow = vertical ? 'ArrowLeft' : 'ArrowUp'
    const shrink = vertical ? 'ArrowRight' : 'ArrowDown'
    if (e.key === grow) setSize(target, value + KEY_STEP)
    else if (e.key === shrink) setSize(target, value - KEY_STEP)
    else if (e.key === 'Home') reset(target)
    else return
    e.preventDefault()
  }

  return (
    <div
      className={`splitter ${vertical ? 'splitter-v' : 'splitter-h'}`}
      style={{ gridArea: area }}
      role="separator"
      aria-orientation={vertical ? 'vertical' : 'horizontal'}
      aria-valuenow={value}
      aria-label={vertical ? 'Resize feeds column' : 'Resize console row'}
      title="Drag to resize · double-click to reset"
      tabIndex={0}
      onPointerDown={onPointerDown}
      onDoubleClick={() => reset(target)}
      onKeyDown={onKeyDown}
    />
  )
}

interface ConsoleSplitterProps {
  /** Index of the console panel on the left of this handle (0 or 1). */
  boundary: 0 | 1
  /** True when a neighbouring console panel is collapsed; the handle is then inert. */
  disabled: boolean
}

/**
 * Vertical handle between two console panels. Sits between them in the `.bottom` grid, so its
 * neighbours are found through the DOM when measuring a drag.
 */
export function ConsoleSplitter({ boundary, disabled }: ConsoleSplitterProps) {
  const split = useLayout((s) => s.consoleSplit)
  const setConsoleSplit = useLayout((s) => s.setConsoleSplit)
  const resetConsoleSplit = useLayout((s) => s.resetConsoleSplit)
  const pair = split[boundary] + split[boundary + 1]
  const leftShare = Math.round((split[boundary] / pair) * 100)

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (disabled) return
    e.preventDefault()
    const el = e.currentTarget
    const left = el.previousElementSibling
    const right = el.nextElementSibling
    if (!left || !right) return
    const leftPx = left.getBoundingClientRect().width
    const pairPx = leftPx + right.getBoundingClientRect().width
    if (pairPx <= 0) return
    el.setPointerCapture(e.pointerId)
    const startX = e.clientX
    const startSplit = useLayout.getState().consoleSplit
    const pairTotal = startSplit[boundary] + startSplit[boundary + 1]
    document.body.classList.add('resizing')

    const move = (ev: globalThis.PointerEvent) => {
      const leftFraction = ((leftPx + ev.clientX - startX) / pairPx) * pairTotal
      setConsoleSplit(boundary, leftFraction)
    }
    const up = () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
      document.body.classList.remove('resizing')
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return
    const current = useLayout.getState().consoleSplit[boundary]
    if (e.key === 'ArrowLeft') setConsoleSplit(boundary, current - CONSOLE_KEY_STEP)
    else if (e.key === 'ArrowRight') setConsoleSplit(boundary, current + CONSOLE_KEY_STEP)
    else if (e.key === 'Home') resetConsoleSplit(boundary)
    else return
    e.preventDefault()
  }

  return (
    <div
      className="splitter splitter-v"
      style={disabled ? { visibility: 'hidden' } : undefined}
      role="separator"
      aria-orientation="vertical"
      aria-valuenow={leftShare}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Resize console panels ${boundary + 1} and ${boundary + 2}`}
      title="Drag to resize · double-click to reset"
      tabIndex={disabled ? -1 : 0}
      onPointerDown={onPointerDown}
      onDoubleClick={() => !disabled && resetConsoleSplit(boundary)}
      onKeyDown={onKeyDown}
    />
  )
}
