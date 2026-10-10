import type { KeyboardEvent, PointerEvent } from 'react'
import { useLayout, type LayoutSizes } from '../state/layout'

interface SplitterProps {
  /** Which layout size this handle controls. */
  target: keyof LayoutSizes
  /** CSS grid area name. */
  area: string
}

const KEY_STEP = 16

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
