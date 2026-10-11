import type { ReactNode } from 'react'
import { StatusLed, type FeedStatus } from './StatusLed'
import { Abbr, TaggedText } from './Abbr'

export interface PanelProps {
  /** Uppercase-tracked panel title, e.g. "NWS Alerts". */
  title: string
  /** Console designator shown before the title: `WX-` weather, `VID-` video, `AUD-` audio, `CCTV-` cameras, `SAT-` satellite, `SPC-` outlooks. */
  code: string
  /** Feed health shown by the header LED. */
  status: FeedStatus
  /** Data age after the meta, e.g. `12s` or `4m05s`. Sand when `status` is stale. Hidden while collapsed. */
  age?: string
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

/** Mission-control panel chrome. Every dashboard panel renders inside one: header (LED, code, title, meta, age, toggle) + scrolling body. */
export function Panel({
  title,
  code,
  status,
  age,
  meta,
  collapsible,
  collapsed = false,
  onToggleCollapse,
  className,
  children,
}: PanelProps) {
  const hasMeta = meta !== undefined && meta !== null && meta !== false
  const showAge = age !== undefined && !collapsed
  const hasTail = hasMeta || showAge || collapsible
  return (
    <section className={['panel', collapsed && 'panel-collapsed', className].filter(Boolean).join(' ')}>
      <header className="panel-head" title={collapsed ? title : undefined}>
        <StatusLed status={status} age={age} />
        <span className="panel-code">
          <Abbr term={code} />
        </span>
        <h2>
          <TaggedText text={title} />
        </h2>
        {hasTail && (
          <span className="panel-tail">
            {hasMeta && <span className="panel-meta">{meta}</span>}
            {showAge && (
              <span className={status === 'stale' ? 'panel-age panel-age-stale' : 'panel-age'}>{age}</span>
            )}
            {collapsible && (
              <button
                type="button"
                className="panel-toggle"
                onClick={onToggleCollapse}
                aria-expanded={!collapsed}
                aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${title}`}
                title={collapsed ? 'Expand' : 'Collapse'}
              >
                {collapsed ? '▸' : '▾'}
              </button>
            )}
          </span>
        )}
      </header>
      {/* Stays mounted when collapsed so iframes and audio keep their state. */}
      <div className="panel-body" hidden={collapsed}>
        {children}
      </div>
    </section>
  )
}
