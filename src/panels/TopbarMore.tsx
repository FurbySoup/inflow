import { useEffect, useId, useRef, useState, type KeyboardEvent, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react'
import { ConsoleButton } from '../ui'
import './topbar-more.css'

// Top-bar MORE menu (WP-44). At ≤ 900 px the settings-type controls (notify, help, layout presets) fold into one
// popover so the bar stays at two rows; above that it renders nothing extra (CSS, topbar-more.css).
// Affordance: press "≡ MORE" to open the popover. Signifier: an outlined console button with its visible text.
// Feedback: the button shows pressed (solid accent) while open; opening moves focus to the first control inside.
// Escape closes it and returns focus to the button, unless the nested notify popover is open (that one takes Escape).
// Clicking outside closes it; picking HELP closes it so the help dialog is not covered. Nothing depends on hover.

const FIRST_CONTROL = 'button:not([disabled]), input:not([disabled]), a[href]'
// KeysButton's visible label. Choosing it closes MORE; the help dialog takes over.
const HELP_LABEL = '? HELP'

/** One instance of each child: the children render once and CSS decides whether they sit in the bar or the popover. */
export function TopbarMore({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLSpanElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    menuRef.current?.querySelector<HTMLElement>(FIRST_CONTROL)?.focus()
    const onPointer = (e: globalThis.MouseEvent) => {
      if (rootRef.current && e.target instanceof Node && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    return () => document.removeEventListener('mousedown', onPointer)
  }, [open])

  const onKeyDown = (e: KeyboardEvent<HTMLSpanElement>) => {
    if (e.key !== 'Escape' || !open) return
    // The notify popover is open inside the menu: its own Escape handling comes first and this one stands down.
    if (menuRef.current?.querySelector('.notify-pop')) return
    setOpen(false)
    rootRef.current?.querySelector<HTMLButtonElement>('.topbar-more-btn')?.focus()
  }

  // Choosing HELP closes the menu (focus then moves to the help dialog, so it is not returned here).
  const onMenuClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!(e.target instanceof Element)) return
    const button = e.target.closest('button')
    if (button && button.textContent?.trim() === HELP_LABEL) setOpen(false)
  }

  return (
    <span className="topbar-more-root" ref={rootRef} onKeyDown={onKeyDown}>
      <ConsoleButton
        className="topbar-more-btn"
        pressed={open}
        aria-expanded={open}
        aria-controls={menuId}
        title="More: notifications, help and layout presets"
        onClick={() => setOpen((v) => !v)}
      >
        ≡ MORE
      </ConsoleButton>
      <div
        ref={menuRef}
        id={menuId}
        className="topbar-more"
        data-open={open ? 'true' : 'false'}
        onClick={onMenuClick}
      >
        {children}
      </div>
    </span>
  )
}
