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
  /** Called when the caption is clicked, to make this the primary feed. */
  onSelect?: () => void
}

/** Live video feed: 16:9 embed with a console caption (CAM nn, title, badges, link-out). Lay several out in `.stream-grid`. */
export function StreamTile({ title, embedUrl, watchUrl, index, inAoi, context, primary, onSelect }: StreamTileProps) {
  return (
    <figure className="stream-tile">
      <iframe
        src={embedUrl}
        title={title}
        // Off-screen feeds load only when scrolled into view; 10+ eager embeds starve the map.
        loading="lazy"
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
      />
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
