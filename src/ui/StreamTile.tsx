import { Badge } from './Badge'

export interface StreamTileProps {
  /** Feed title, e.g. "Brandon Copic: tropical tornado threat, E GA & SC". */
  title: string
  /** iframe-ready embed URL (YouTube `/embed/...`). Never add referrerpolicy="no-referrer" — YouTube then fails with Error 153. */
  embedUrl: string
  /** Public watch page opened by the ↗ link. */
  watchUrl?: string
  /** 0-based position; shown as `CAM 01`, `CAM 02`, ... */
  index: number
  /** Shows the IN AOI badge. */
  inAoi?: boolean
  /** Ambient context feed (e.g. NASA ISS Earth view): shows the CTX badge. */
  context?: boolean
  /** Marks this tile as the large primary feed (aria-current). */
  primary?: boolean
  /** Makes this the primary feed. Wired to the caption and, on non-primary tiles, the "⇱ MAIN" swap button. */
  onSelect?: () => void
  /** Primary only: whether the main feed plays with sound. Shown as a 🔇/🔊 toggle on the video corner. */
  soundOn?: boolean
  /** Primary only: toggles main-feed sound. Omit to hide the toggle. */
  onToggleSound?: () => void
}

/**
 * Live video feed: 16:9 embed with a console caption (CAM nn, title, badges, link-out). Lay several out in `.stream-grid`.
 * Affordance: become the main feed. Signifier: a persistent "⇱ MAIN" button on the video corner of non-primary tiles
 * (clicking the video itself only plays/pauses inside the player). Feedback: the primary tile shows a read-only MAIN tag
 * and an accent caption.
 */
export function StreamTile({
  title,
  embedUrl,
  watchUrl,
  index,
  inAoi,
  context,
  primary,
  onSelect,
  soundOn = false,
  onToggleSound,
}: StreamTileProps) {
  return (
    <figure className="stream-tile">
      <div className="stream-frame">
        <iframe
          src={embedUrl}
          title={title}
          // Off-screen feeds load only when scrolled into view; 10+ eager embeds starve the map.
          loading="lazy"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
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
            <button type="button" className="stream-swap" onClick={onSelect} aria-label={`Make ${title} the main feed`} title="Make this the main feed">
              ⇱ MAIN
            </button>
          )
        )}
      </div>
      <figcaption>
        <button
          type="button"
          className="stream-select"
          onClick={onSelect}
          aria-current={primary ? 'true' : undefined}
          title="Show this feed large"
        >
          <span className="panel-code">CAM {String(index + 1).padStart(2, '0')}</span> {title}
        </button>
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
