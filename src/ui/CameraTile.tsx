import type { Ref } from 'react'

export interface CameraTileProps {
  /** Camera name, e.g. "US-54 at Sycamore". */
  title: string
  /** Snapshot image URL or data URL; null shows an empty frame while loading. */
  src: string | null
  /** Called when the tile is clicked (e.g. to expand it). */
  onOpen?: () => void
  /** Called when the image fails to load. */
  onError?: () => void
  ref?: Ref<HTMLButtonElement>
}

/** Traffic-camera snapshot tile (4:3 image + caption). Lay several out in `.cam-grid`. */
export function CameraTile({ title, src, onOpen, onError, ref }: CameraTileProps) {
  return (
    <button ref={ref} type="button" className="cam-tile" title={title} onClick={onOpen}>
      {src ? (
        <img className="cam-tile-img" src={src} alt={title} loading="lazy" onError={onError} />
      ) : (
        <div className="cam-tile-img" aria-label={title} />
      )}
      <span className="cam-tile-caption">{title}</span>
    </button>
  )
}
