import type { CSSProperties, ReactNode } from 'react'

import type { FeedStatus } from '../lib/feedStatus'
import { useLayout } from '../state/layout'

interface PanelProps {
  title: string
  /** Short console-style code shown before the title, e.g. "WX-01". */
  code: string
  status: FeedStatus
  /** Right-aligned metadata, e.g. item count or last update time. */
  meta?: ReactNode
  className?: string
  /** Shows a collapse toggle in the header. Collapsed state lives in the layout store (ADR-0011). */
  collapsible?: boolean
  children: ReactNode
}

const toggleStyle: CSSProperties = {
  fontFamily: 'var(--font-data)',
  fontSize: '0.75rem',
  lineHeight: 1,
  color: 'var(--accent)',
  background: 'transparent',
  border: 'none',
  padding: '2px 4px',
  cursor: 'pointer',
}

/** Shared mission-control panel chrome. Every panel renders inside one of these. */
export function Panel({ title, code, status, meta, className, collapsible, children }: PanelProps) {
  const collapsed = useLayout((s) => s.hidden.includes(code))
  const toggleHidden = useLayout((s) => s.toggleHidden)

  return (
    <section
      className={`panel ${className ?? ''}`}
      style={collapsed ? { flex: 'none' } : undefined}
    >
      <header className="panel-head">
        <span className={`led led-${status}`} aria-label={status} />
        <span className="panel-code">{code}</span>
        <h2>{title}</h2>
        {meta && <span className="panel-meta">{meta}</span>}
        {collapsible && (
          <button
            type="button"
            onClick={() => toggleHidden(code)}
            aria-expanded={!collapsed}
            aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${title}`}
            title={collapsed ? 'Expand' : 'Collapse'}
            style={{ ...toggleStyle, marginLeft: meta ? 0 : 'auto' }}
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
