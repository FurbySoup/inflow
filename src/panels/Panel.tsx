import { useEffect, useState } from 'react'
import { Panel as UiPanel, type FeedStatus, type PanelProps as UiPanelProps } from '../ui'
import { useLayout } from '../state/layout'
import { resolveFeed, type FeedState } from '../lib/feedStatus'

type PanelProps = Omit<UiPanelProps, 'collapsed' | 'onToggleCollapse' | 'status' | 'age'> & {
  /** `queryStatus(query)` for a bare light, or `queryFeed(query, refreshMs)` to also show the data age. */
  status: FeedStatus | FeedState
}

/** Current time, re-read once a second while mounted; skipped while the page is hidden. */
function useNow(enabled: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!enabled) return
    const tick = () => {
      if (document.visibilityState === 'visible') setNow(Date.now())
    }
    const id = window.setInterval(tick, 1000)
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [enabled])
  return now
}

/** UI-kit Panel wired to the layout store: collapse state is keyed by `code` (ADR-0011). */
export function Panel({ status, ...props }: PanelProps) {
  const collapsed = useLayout((s) => s.hidden.includes(props.code))
  const toggleHidden = useLayout((s) => s.toggleHidden)
  const now = useNow(typeof status !== 'string')
  const resolved = typeof status === 'string' ? { status } : resolveFeed(status, now)
  return (
    <UiPanel
      {...props}
      status={resolved.status}
      age={resolved.age}
      collapsed={collapsed}
      onToggleCollapse={() => toggleHidden(props.code)}
    />
  )
}
