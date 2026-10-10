import { StreamTile } from 'storm-chasers'

// Real GA/SC outbreak broadcasts (2026-10-10). Embed URLs must keep a Referer (no referrerpolicy="no-referrer").
const embed = (id: string) => `https://www.youtube.com/embed/${id}?mute=1`
const watch = (id: string) => `https://www.youtube.com/watch?v=${id}`

/** Primary feed: full width, accent caption, IN AOI badge, link-out. */
export const Primary = () => (
  <div style={{ width: 380, padding: 10, background: 'var(--panel)' }}>
    <StreamTile
      title="Live proofing: GA/SC tornado outbreak"
      embedUrl={embed('7kQACmPd6Io')}
      watchUrl={watch('7kQACmPd6Io')}
      index={0}
      inAoi
      primary
      onSelect={() => {}}
    />
  </div>
)

/** Thumbnail grid of secondary feeds, one context feed sorted last. */
export const ThumbnailGrid = () => (
  <div style={{ width: 380, padding: 10, background: 'var(--panel)' }}>
    <div className="stream-grid">
      <StreamTile title="Brandon Copic: tropical tornado threat, E GA & SC" embedUrl={embed('Syyvt9aidlQ')} watchUrl={watch('Syyvt9aidlQ')} index={1} inAoi onSelect={() => {}} />
      <StreamTile title="Corey Gerken: increasing tornado threat GA/SC" embedUrl={embed('hvn71J7v1-0')} watchUrl={watch('hvn71J7v1-0')} index={2} inAoi onSelect={() => {}} />
      <StreamTile title="WRDW News 12 (Augusta TV): Screven County tornado" embedUrl={embed('QaOKJLeJwDY')} watchUrl={watch('QaOKJLeJwDY')} index={3} inAoi onSelect={() => {}} />
      <StreamTile title="Mikes Weather Page: chasing Isaias" embedUrl={embed('xERSsW9bMnI')} watchUrl={watch('xERSsW9bMnI')} index={4} context onSelect={() => {}} />
    </div>
  </div>
)
