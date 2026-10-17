import { useEffect, useState } from 'react'
import { nwsAlerts } from '../sources/nws/alerts'
import { useSource } from '../lib/useSource'
import { useAoi } from '../state/aoi'
import { threatSummary } from './threat'
import { BASE_TITLE, badgedFavicon, countInAoi, levelFor, titleFor, type WarningCounts } from './warningTitle'

// Warning-aware tab title and favicon (WP-54): another browser tab shows an active warning in the AOI.
// Counts come from the same feed and rules as the top-bar threat button. With no data (pending or errored
// with nothing to show) the title stays INFLOW, so it never claims anything it has not read.

const REFRESH_MS = 30_000

let faviconSvg: Promise<string | null> | null = null

/** The original /favicon.svg text, fetched once. A failed fetch is not cached, so the next change retries. */
function loadFaviconSvg(): Promise<string | null> {
  faviconSvg ??= fetch('/favicon.svg')
    .then((r) => {
      if (!r.ok) throw new Error(`favicon ${r.status}`)
      return r.text()
    })
    .catch(() => {
      faviconSvg = null
      return null
    })
  return faviconSvg
}

/** Test-only: forget the cached favicon so a test can exercise a fresh fetch. */
export function resetFaviconCacheForTests(): void {
  faviconSvg = null
}

const svgDataUrl = (svg: string) => `data:image/svg+xml,${encodeURIComponent(svg)}`

function iconLink(): HTMLLinkElement | null {
  return document.querySelector<HTMLLinkElement>('link[rel="icon"]')
}

export function useWarningTitle(): void {
  const query = useSource(nwsAlerts)
  const bbox = useAoi((s) => s.bbox)
  const states = useAoi((s) => s.states)
  const aoi = { bbox, states }
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), REFRESH_MS)
    return () => clearInterval(timer)
  }, [])

  // On a feed error TanStack keeps the last good data: the title keeps those counts (like the threat button), so a
  // glitch never drops an active tornado warning from the tab. Pending (no data yet) still reads plain INFLOW.
  const alerts = query.data
  const counts: WarningCounts =
    alerts === undefined
      ? { tor: 0, svr: 0 }
      : { tor: threatSummary(alerts, aoi, now).count, svr: countInAoi(alerts, aoi, now, 'SVR') }
  const { tor, svr } = counts
  const level = levelFor(counts)

  useEffect(() => {
    document.title = titleFor({ tor, svr })
    if (tor > 0) document.documentElement.dataset.tor = 'active'
    else delete document.documentElement.dataset.tor
    return () => {
      document.title = BASE_TITLE
      delete document.documentElement.dataset.tor
    }
  }, [tor, svr])

  useEffect(() => {
    if (level === null) return
    const link = iconLink()
    if (!link) return
    const original = link.getAttribute('href')
    let cancelled = false
    void loadFaviconSvg().then((svg) => {
      if (cancelled || svg === null) return
      link.setAttribute('href', svgDataUrl(badgedFavicon(svg, level)))
    })
    return () => {
      cancelled = true
      if (original !== null) link.setAttribute('href', original)
    }
  }, [level])
}
