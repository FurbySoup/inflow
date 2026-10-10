import type { ReactNode } from 'react'

import type { FeedStatus } from '../lib/feedStatus'

interface PanelProps {
  title: string
  /** Short console-style code shown before the title, e.g. "WX-01". */
  code: string
  status: FeedStatus
  /** Right-aligned metadata, e.g. item count or last update time. */
  meta?: ReactNode
  className?: string
  children: ReactNode
}

/** Shared mission-control panel chrome. Every panel renders inside one of these. */
export function Panel({ title, code, status, meta, className, children }: PanelProps) {
  return (
    <section className={`panel ${className ?? ''}`}>
      <header className="panel-head">
        <span className={`led led-${status}`} aria-label={status} />
        <span className="panel-code">{code}</span>
        <h2>{title}</h2>
        {meta && <span className="panel-meta">{meta}</span>}
      </header>
      <div className="panel-body">{children}</div>
    </section>
  )
}
