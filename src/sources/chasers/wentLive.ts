import type { NotifyEvent } from '../../state/notify'
import type { Chaser } from './roster'
import type { RosterResult } from './scheduler'

/**
 * Pure went-live diff. A channel that was not live (offline, unknown or never checked) and is live now
 * emits once, keyed by its videoId, so the same broadcast never notifies twice. Roster order is kept.
 * Voice (HANDOFF §1): a coverage outlet is COVERAGE LIVE, never "alert" or "warning".
 */
export function wentLiveEvents(
  prev: ReadonlyMap<string, RosterResult>,
  next: ReadonlyMap<string, RosterResult>,
  chasers: readonly Chaser[],
  at: number,
): NotifyEvent[] {
  const events: NotifyEvent[] = []
  for (const chaser of chasers) {
    const now = next.get(chaser.channelId)
    if (now?.state !== 'live' || now.videoId === undefined) continue
    if (prev.get(chaser.channelId)?.state === 'live') continue
    const label = chaser.kind === 'coverage' ? 'COVERAGE LIVE' : 'CHASER LIVE'
    events.push({
      kind: 'chaser-live',
      key: `chaser:${chaser.channelId}:${now.videoId}`,
      title: `${label} · ${chaser.name.toUpperCase()}`,
      body: `${chaser.name} is streaming live.`,
      at,
      level: 'CHASER',
    })
  }
  return events
}
