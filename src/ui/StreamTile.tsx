import { useState } from 'react'

import { Badge } from './Badge'
import { StatusLed, type FeedStatus } from './StatusLed'
import { Abbr } from './Abbr'
import { GLOSSARY } from './glossary'

/** A thumbnail's still image and its age label. Only the primary feed plays by default; a thumbnail plays only after WATCH (ADR-0017). */
export interface StreamSnapshot {
  /** Still image URL, or null to show `placeholder` instead. A URL that fails to load also shows `placeholder`. */
  src: string | null
  /** Copy shown in place of a still, e.g. `◐ STALE`, `○ OFFLINE`, `connecting…`. */
  placeholder: string
  /** Read-only age label, e.g. `THUMB ≤5m`. Omit when there is no still. */
  ageLabel?: string
  /** Stale label (still not re-fetched for over 3 min): sand, with a ◐ prefix in the label text. */
  stale?: boolean
}

/** `live` confirmed live · `replay` ended or pinned past video (plays as a recording) · `offline` · `unchecked` not checked yet. */
export type StreamLiveKind = 'live' | 'replay' | 'offline' | 'unchecked'

const LIVE_KIND_LABEL: Record<StreamLiveKind, string> = {
  live: '● LIVE',
  replay: '↺ REPLAY',
  offline: '○ OFFLINE',
  unchecked: '◌ UNCHECKED',
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
  /** ENDED / OFFLINE tag next to the caption. Ignored when `liveKind` is set (the frame tag replaces it). */
  statusLabel?: string
  /** Live-kind tag on the frame's top-left: `● LIVE`, `↺ REPLAY`, `○ OFFLINE`, `◌ UNCHECKED`. Read-only. */
  liveKind?: StreamLiveKind
  /** Marks this tile as the large primary feed (aria-current). The primary always shows its embed. */
  primary?: boolean
  /** Makes this the primary feed. Wired to the caption and, on thumbnails, the ▲ MAIN button. */
  onSelect?: () => void
  /** Iframe-ready embed URL (YouTube `/embed/...`). The primary always plays it; a thumbnail plays it only while `playing`. Never add referrerpolicy="no-referrer": YouTube then fails with Error 153. */
  embedUrl?: string
  /** Thumbnail only: true while the user has started it with WATCH. Swaps the still for the embed and shows `PLAYING · MUTED`. */
  playing?: boolean
  /** Thumbnail only: starts playback (WATCH). Omit, or pass `liveKind="offline"`, to hide the button. */
  onPlay?: () => void
  /** Thumbnail only: stops playback (STILL), returning to the still. */
  onStop?: () => void
  /** Primary only: whether the main feed plays with sound. Shown as a 🔇/🔊 toggle on the video corner. */
  soundOn?: boolean
  /** Primary only: toggles main-feed sound. Omit to hide the toggle. */
  onToggleSound?: () => void
  /** Thumbnail only: the still image shown instead of a player. */
  snapshot?: StreamSnapshot
}

/**
 * Chaser feed tile (16:9 frame + console caption with status LED, badges and link-out). The primary
 * tile plays its embed. Other tiles show a still image that the app refreshes (no iframe, no decode)
 * until the user starts them. Lay several out in `.stream-grid`.
 *
 * Affordances and signifiers (all on a top bar over the frame):
 * - Live kind: a read-only tag at the top-left (`● LIVE` solid phosphor, `↺ REPLAY`, `○ OFFLINE`, `◌ UNCHECKED`
 *   muted). The words carry the state, never colour alone. Never a hazard red. No border-button look, no pointer.
 * - WATCH / STILL: a persistent `btn-console` at the top-right, left of ▲ MAIN. `▶ WATCH` starts the embed with
 *   sound off; `■ STILL` returns to the still. Hidden for OFFLINE tiles. Feedback: a playing tile's button fills solid.
 * - ▲ MAIN: promotes a thumbnail to the main feed. The primary shows a read-only MAIN tag instead.
 * - 🔇/🔊 (primary only): main-feed sound toggle, top-left, after the live tag.
 * - Still vs playing: a still shows its THUMB age label (bottom-left). A playing thumbnail shows
 *   `PLAYING · MUTED` in the same place, so a still is never mistaken for video, and vice versa.
 * The THUMB age and the live and PLAYING tags are read-only: no border-button look, no pointer.
 */
export function StreamTile({
  title,
  index,
  watchUrl,
  inAoi,
  context,
  ledStatus = 'loading',
  statusLabel,
  liveKind,
  primary,
  onSelect,
  embedUrl,
  playing = false,
  onPlay,
  onStop,
  soundOn = false,
  onToggleSound,
  snapshot,
}: StreamTileProps) {
  // A still that fails to load (e.g. 404 for an unknown id) gives way to the placeholder until the next fetch changes its URL.
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const still = snapshot?.src && snapshot.src !== failedSrc ? snapshot.src : null
  // The primary always plays its embed; a thumbnail plays only once started, and never without an embed.
  const embedded = Boolean(embedUrl) && (primary || playing)

  const watchAction =
    primary || liveKind === 'offline'
      ? undefined
      : playing
        ? onStop && { label: '■ STILL', run: onStop }
        : onPlay && { label: '▶ WATCH', run: onPlay }

  const startItems = [
    liveKind && (
      <span key="live" className="stream-live" data-kind={liveKind}>
        {LIVE_KIND_LABEL[liveKind]}
      </span>
    ),
    primary && onToggleSound && (
      <button
        key="sound"
        type="button"
        className="stream-sound"
        onClick={onToggleSound}
        aria-pressed={soundOn}
        aria-label={soundOn ? 'Mute main feed' : 'Unmute main feed'}
        title={soundOn ? 'Sound on: feeds promoted to main play with sound' : 'Sound off: main feed is muted'}
      >
        {soundOn ? '🔊 SOUND' : '🔇 MUTED'}
      </button>
    ),
  ]
  const endItems = [
    watchAction && (
      <button
        key="watch"
        type="button"
        className="btn-console stream-play"
        data-playing={playing ? 'true' : 'false'}
        onClick={watchAction.run}
        aria-label={`${watchAction.label} ${title}`}
        title={playing ? 'Stop playing and show the still' : 'Play this feed here, sound off'}
      >
        {watchAction.label}
      </button>
    ),
    primary ? (
      <span key="main" className="stream-main-tag">
        MAIN
      </span>
    ) : (
      onSelect && (
        <button
          key="main"
          type="button"
          className="stream-promote"
          onClick={onSelect}
          aria-label={`Make ${title} the main feed`}
          title="Make this the main feed"
        >
          ▲ MAIN
        </button>
      )
    ),
  ]
  const hasBar = startItems.some(Boolean) || endItems.some(Boolean)

  return (
    <figure className="stream-tile">
      <div className="stream-frame">
        {embedded ? (
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
                alt="" // the caption already names the feed
                decoding="async"
                onError={() => setFailedSrc(still)}
              />
            ) : (
              <span className="stream-still-empty">{snapshot?.placeholder ?? 'connecting…'}</span>
            )}
            {snapshot?.ageLabel && (
              <span className={snapshot.stale ? 'stream-age stream-age-stale' : 'stream-age'} title={GLOSSARY.THUMB}>
                {snapshot.ageLabel}
              </span>
            )}
          </div>
        )}
        {embedded && !primary && <span className="stream-state">PLAYING · MUTED</span>}
        {hasBar && (
          <div className="stream-bar">
            <div className="stream-bar-group">{startItems}</div>
            <div className="stream-bar-group">{endItems}</div>
          </div>
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
          <span className="panel-code">
            <Abbr term="CAM" /> {String(index + 1).padStart(2, '0')}
          </span>{' '}
          {title}
        </button>
        {statusLabel && !liveKind && <Badge variant="ctx">{statusLabel}</Badge>}
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
