import { useEffect, useMemo, useRef } from 'react'
import { useAoi } from '../state/aoi'
import { emitNotify } from '../state/notify'
import { useSource } from '../lib/useSource'
import { nwsAlerts } from '../sources/nws/alerts'
import { spcWatchBoxes } from '../sources/iemspc/watches'
import { spcMesoscale } from '../sources/iemspc/mesoscale'
import { spcOutlookDay } from '../sources/spc/outlook'
import {
  diffNwsAlerts,
  diffRiskUpgrade,
  diffSpcMds,
  diffSpcWatches,
  mdKeys,
  nwsKeys,
  outlookIssue,
  remember,
  watchKeys,
  type Seen,
} from './triggers'

// Background copies share each adapter's id, so TanStack shares the cache with the panels. Only these observers keep
// polling while the tab is hidden (ADR-0019, SourceAdapter.background).
const NWS_BG = { ...nwsAlerts, background: true }
const WATCH_BG = { ...spcWatchBoxes, background: true }
const MD_BG = { ...spcMesoscale, background: true }
const D1_BG = { ...spcOutlookDay(1), background: true }

/**
 * Polls what the notifications need and emits new events to the bus. Each source seeds on first load and remembers
 * every key in its feed, so panning the AOI never notifies something that already existed.
 */
export function useNotifyTriggers(): void {
  const bbox = useAoi((s) => s.bbox)
  const states = useAoi((s) => s.states)
  const aoi = useMemo(() => ({ bbox, states }), [bbox, states])
  const nws = useSource(NWS_BG)
  const watches = useSource(WATCH_BG)
  const mds = useSource(MD_BG)
  const d1 = useSource(D1_BG)

  const seenNws = useRef<Seen>(null)
  const seenWatches = useRef<Seen>(null)
  const seenMds = useRef<Seen>(null)
  const prevDay1 = useRef<GeoJSON.Feature[] | null>(null)

  useEffect(() => {
    if (!nws.data) return
    for (const event of diffNwsAlerts(seenNws.current, nws.data, aoi, Date.now())) emitNotify(event)
    seenNws.current = remember(seenNws.current, nwsKeys(nws.data))
  }, [nws.data, aoi])

  useEffect(() => {
    if (!watches.data) return
    for (const event of diffSpcWatches(seenWatches.current, watches.data, aoi, Date.now())) emitNotify(event)
    seenWatches.current = remember(seenWatches.current, watchKeys(watches.data))
  }, [watches.data, aoi])

  useEffect(() => {
    if (!mds.data) return
    for (const event of diffSpcMds(seenMds.current, mds.data, aoi, Date.now())) emitNotify(event)
    seenMds.current = remember(seenMds.current, mdKeys(mds.data))
  }, [mds.data, aoi])

  useEffect(() => {
    if (!d1.data) return
    for (const event of diffRiskUpgrade(prevDay1.current, d1.data, aoi, Date.now())) emitNotify(event)
    // An empty day has no issuance to compare against, so it never replaces the last real one.
    if (outlookIssue(d1.data) !== null) prevDay1.current = d1.data
  }, [d1.data, aoi])
}
