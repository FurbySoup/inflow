import type { ReactNode } from 'react'
import { StatusLed, type FeedStatus } from './StatusLed'

export interface PanelProps {
  /** Uppercase-tracked panel title, e.g. "NWS Alerts". */
  title: string
  /** Console designator shown before the title: `WX-` weather, `VID-` video, `AUD-` audio, `CCTV-` cameras, `SAT-` satellite, `SPC-` outlooks. */
  code: string
  /** Feed health shown by the header LED. */
  status: FeedStatus
  /** Right-aligned header metadata, e.g. an item count. */
  meta?: ReactNode
  /** Shows a ▾/▸ collapse toggle in the header. */
  collapsible?: boolean
  /** Collapsed panels render only LED + code + toggle; the body stays mounted but hidden. */
  collapsed?: boolean
  /** Called when the collapse toggle is pressed. */
  onToggleCollapse?: () => void
  className?: string
  children?: ReactNode
}

/** Mission-control panel chrome. Every dashboard panel renders inside one: header (LED, code, title, meta) + scrolling body. */
export function Panel({
  title,
  code,
  status,
  meta,
  collapsible,
  collapsed = false,
  onToggleCollapse,
  className,
  children,
}: PanelProps) {
  const hasMeta = meta !== undefined && meta !== null && meta !== false
  return (
    <section className={['panel', collapsed && 'panel-collapsed', className].filter(Boolean).join(' ')}>
      <header className="panel-head" title={collapsed ? title : undefined}>
        <StatusLed status={status} />
        <span className="panel-code">{code}</span>
        <h2>{title}</h2>
        {hasMeta && <span className="panel-meta">{meta}</span>}
        {collapsible && (
          <button
            type="button"
            className={hasMeta ? 'panel-toggle' : 'panel-toggle panel-toggle-push'}
            onClick={onToggleCollapse}
            aria-expanded={!collapsed}
            aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${title}`}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? '▸' : '▾'}
          </button>
        )}
      </header>
      {/* Stays mounted when collapsed so iframes and audio keep their state. */}
      <div className="panel-body" hidden={collapsed}>
        {children}
      </div>
    </section>
  )
}
