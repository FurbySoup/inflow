import { useState } from 'react'

import { Badge } from './Badge'
import { StatusLed, type FeedStatus } from './StatusLed'

/** A thumbnail's still image and its age label. Only the primary feed plays video (HANDOFF §9.10). */
export interface StreamSnapshot {
  /** Still image URL, or null to show `placeholder` instead. */
  src: string | null
  /** Tried once when `src` fails to load. */
  fallbackSrc?: string
  /** Copy shown in place of a still, e.g. `◐ STALE`, `○ OFFLINE`, `connecting…`. */
  placeholder: string
  /** Read-only age label, e.g. `SNAP 12s`. Omit when there is no still. */
  ageLabel?: string
  /** Turns the age label sand (a still older than 60 s). */
  stale?: boolean
}

export interface StreamTileProps {
  /** Feed title, e.g. "Brandon Copic: tropical tornado threat, E GA & SC". */
  title: string
  /** 0-based position; shown as `CAM 01`, `CAM 02`, ... */
  index: number
  /** Public watch page opened by the ↗ link. */
  watchUrl?: string
  /** Shows the IN AOI badge. */
  inAoi?: boolean
  /** Ambient context feed (e.g. NASA ISS Earth view): shows the CTX badge. */
  context?: boolean
  /** Feed health, drawn as the caption's status LED. Defaults to `loading` (not checked yet). */
  ledStatus?: FeedStatus
  /** ENDED / OFFLINE tag next to the caption. */
  statusLabel?: string
  /** Marks this tile as the large primary feed (aria-current). Only the primary has an iframe. */
  primary?: boolean
  /** Makes this the primary feed. Wired to the caption and, on thumbnails, the ▲ MAIN button. */
  onSelect?: () => void
  /** Primary only: iframe-ready embed URL (YouTube `/embed/...`). Never add referrerpolicy="no-referrer": YouTube then fails with Error 153. */
  embedUrl?: string
  /** Primary only: whether the main feed plays with sound. Shown as a 🔇/🔊 toggle on the video corner. */
  soundOn?: boolean
  /** Primary only: toggles main-feed sound. Omit to hide the toggle. */
  onToggleSound?: () => void
  /** Thumbnail only: the still image shown instead of a player. */
  snapshot?: StreamSnapshot
}

/**
 * Chaser feed tile (16:9 frame + console caption with status LED, badges and link-out). The primary
 * tile plays its embed; other tiles show a still image that the app refreshes (no iframe, no decode).
 * Lay several out in `.stream-grid`.
 * Affordance: become the main feed. Signifier: a persistent "▲ MAIN" button on the frame corner of
 * thumbnails (the video itself only plays/pauses inside the player). Feedback: the primary tile shows a
 * read-only MAIN tag and an accent caption. The SNAP age is read-only: no border, no pointer.
 */
export function StreamTile({
  title,
  index,
  watchUrl,
  inAoi,
  context,
  ledStatus = 'loading',
  statusLabel,
  primary,
  onSelect,
  embedUrl,
  soundOn = false,
  onToggleSound,
  snapshot,
}: StreamTileProps) {
  const [failed, setFailed] = useState<readonly string[]>([])
  const still = snapshot ? pickStill(snapshot, failed) : null

  return (
    <figure className="stream-tile">
      <div className="stream-frame">
        {embedUrl ? (
          <iframe
            src={embedUrl}
            title={title}
            // Off-screen feeds load only when scrolled into view; 10+ eager embeds starve the map.
            loading="lazy"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="stream-still">
            {still ? (
              <img
                className="stream-still-img"
                src={still}
                alt={title}
                decoding="async"
                onError={() => setFailed((prev) => [...prev.slice(-3), still])}
              />
            ) : (
              <span className="stream-still-empty">{snapshot?.placeholder ?? 'connecting…'}</span>
            )}
            {snapshot?.ageLabel && (
              <span className={snapshot.stale ? 'stream-age stream-age-stale' : 'stream-age'}>{snapshot.ageLabel}</span>
            )}
          </div>
        )}
        {primary && onToggleSound && (
          <button
            type="button"
            className="stream-sound"
            onClick={onToggleSound}
            aria-pressed={soundOn}
            aria-label={soundOn ? 'Mute main feed' : 'Unmute main feed'}
            title={soundOn ? 'Sound on: feeds swapped to main play with sound' : 'Sound off: main feed is muted'}
          >
            {soundOn ? '🔊 SOUND' : '🔇 MUTED'}
          </button>
        )}
        {primary ? (
          <span className="stream-main-tag">MAIN</span>
        ) : (
          onSelect && (
            <button type="button" className="stream-promote" onClick={onSelect} aria-label={`Make ${title} the main feed`} title="Make this the main feed">
              ▲ MAIN
            </button>
          )
        )}
      </div>
      <figcaption>
        <StatusLed status={ledStatus} />
        <button
          type="button"
          className="stream-select"
          onClick={onSelect}
          aria-current={primary ? 'true' : undefined}
          title="Show this feed large"
        >
          <span className="panel-code">CAM {String(index + 1).padStart(2, '0')}</span> {title}
        </button>
        {statusLabel && <Badge variant="ctx">{statusLabel}</Badge>}
        {inAoi && <Badge variant="aoi" />}
        {context && <Badge variant="ctx" />}
        {watchUrl && (
          <a className="stream-link" href={watchUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open ${title} externally`}>
            ↗
          </a>
        )}
      </figcaption>
    </figure>
  )
}

/** The still to show now: the primary URL, then the fallback, skipping any that already failed. */
function pickStill(snapshot: StreamSnapshot, failed: readonly string[]): string | null {
  const candidates = [snapshot.src, snapshot.fallbackSrc]
  return candidates.find((c): c is string => typeof c === 'string' && !failed.includes(c)) ?? null
}
