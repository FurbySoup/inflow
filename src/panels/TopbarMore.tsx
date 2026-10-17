import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react'
import { ConsoleButton } from '../ui'
import './topbar-more.css'

// Top-bar MORE menu (WP-44). At ≤ 900 px the settings-type controls (notify, help, layout presets) fold into one
// popover so the bar stays at two rows; above that it renders nothing extra (CSS, topbar-more.css).
// Affordance: press "≡ MORE" to open the popover. Signifier: an outlined console button with its visible text.
// Feedback: a disclosure (aria-expanded, no aria-pressed); while open the button fills solid accent (CSS). Opening
// moves focus to the first control inside. The popover is fixed under the button, placed from its rect in JS and
// kept inside the viewport (clampLeft), and re-placed on resize while open.
// Escape closes it and returns focus to the button, unless the nested notify popover is open (that one takes Escape).
// Clicking outside closes it; picking HELP closes it so the help dialog is not covered. Nothing depends on hover.

const FIRST_CONTROL = 'button:not([disabled]), input:not([disabled]), a[href]'
// KeysButton's visible label is the contract here: choosing it closes MORE; the help dialog takes over.
const HELP_LABEL = '? HELP'
const GUTTER = 12
const POPOVER_GAP = 6
const NARROW_QUERY = '(max-width: 900px)'

/**
 * Left edge for a popover of `popWidth` that right-aligns to `buttonRight`, kept at least `gutter` px from both
 * viewport edges. A popover wider than the viewport minus both gutters pins to the left gutter.
 */
// Exported for the unit tests; the fast-refresh warning is accepted for this pure helper (kept here to stay in this WP's files).
// eslint-disable-next-line react-refresh/only-export-components
export function clampLeft(buttonRight: number, popWidth: number, viewportWidth: number, gutter = GUTTER): number {
  const desired = buttonRight - popWidth
  const max = viewportWidth - gutter - popWidth
  return Math.max(gutter, Math.min(desired, max))
}

/** True at the ≤ 900 px tier, where the popover is used. Without matchMedia (test runners) the popover is placed. */
function isNarrow(): boolean {
  return typeof window.matchMedia === 'function' ? window.matchMedia(NARROW_QUERY).matches : true
}

/** One instance of each child: the children render once and CSS decides whether they sit in the bar or the popover. */
export function TopbarMore({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const rootRef = useRef<HTMLSpanElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const menuId = useId()

  // Places the open popover under the button. Above the narrow tier no inline position is set at all.
  const place = useCallback(() => {
    const button = rootRef.current?.querySelector<HTMLElement>('.topbar-more-btn')
    const menu = menuRef.current
    if (!button || !menu || !isNarrow()) {
      setPos(null)
      return
    }
    const rect = button.getBoundingClientRect()
    setPos({
      top: rect.bottom + POPOVER_GAP,
      left: clampLeft(rect.right, menu.offsetWidth, window.innerWidth),
    })
  }, [])

  // Layout effect: the position is set before paint, so the popover never shows at the wrong edge.
  useLayoutEffect(() => {
    if (!open) {
      setPos(null)
      return
    }
    place()
    // Growing past the narrow tier puts the controls back in the bar, so the menu closes rather than stay "open" unseen.
    const onResize = () => (isNarrow() ? place() : setOpen(false))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [open, place])

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
        style={pos ? { top: pos.top, left: pos.left } : undefined}
        onClick={onMenuClick}
      >
        {children}
      </div>
    </span>
  )
}
