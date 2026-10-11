import { StreamTile } from 'storm-chasers'

// Real GA/SC outbreak broadcasts (2026-10-10). Embed URLs must keep a Referer (no referrerpolicy="no-referrer").
const embed = (id: string) => `https://www.youtube.com/embed/${id}?mute=1`
const watch = (id: string) => `https://www.youtube.com/watch?v=${id}`
const still = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg?t=1`

/** Primary feed: read-only MAIN tag, 🔇 MUTED sound toggle (outlined), accent caption, IN AOI badge, link-out. */
export const Primary = () => (
  <div style={{ width: 380, padding: 10, background: 'var(--surface-panel)' }}>
    <StreamTile
      title="Live proofing: GA/SC tornado outbreak"
      embedUrl={embed('7kQACmPd6Io')}
      watchUrl={watch('7kQACmPd6Io')}
      index={0}
      inAoi
      ledStatus="live"
      primary
      onSelect={() => {}}
      soundOn={false}
      onToggleSound={() => {}}
    />
  </div>
)

/** Primary feed with sound on: the toggle reads 🔊 SOUND and fills solid accent (aria-pressed). */
export const PrimarySoundOn = () => (
  <div style={{ width: 380, padding: 10, background: 'var(--surface-panel)' }}>
    <StreamTile
      title="Live proofing: GA/SC tornado outbreak"
      embedUrl={embed('7kQACmPd6Io')}
      watchUrl={watch('7kQACmPd6Io')}
      index={0}
      inAoi
      ledStatus="live"
      primary
      onSelect={() => {}}
      soundOn
      onToggleSound={() => {}}
    />
  </div>
)

/** Live thumbnail: a still with a muted THUMB ≤5m label (read-only), a persistent ▲ MAIN promote button, live LED. */
export const SnapshotLive = () => (
  <div style={{ width: 380, padding: 10, background: 'var(--surface-panel)' }}>
    <StreamTile
      title="Brandon Copic: tropical tornado threat, E GA & SC"
      watchUrl={watch('Syyvt9aidlQ')}
      index={1}
      inAoi
      ledStatus="live"
      onSelect={() => {}}
      snapshot={{ src: still('Syyvt9aidlQ'), placeholder: 'connecting…', ageLabel: 'THUMB ≤5m' }}
    />
  </div>
)

/** Stale still (not re-fetched for over 3 min, e.g. off screen): the label turns sand with a ◐ prefix. Unknown check shows the ◐ STALE placeholder. */
export const SnapshotStale = () => (
  <div style={{ width: 380, padding: 10, background: 'var(--surface-panel)' }}>
    <div className="stream-grid">
      <StreamTile
        title="Corey Gerken: increasing tornado threat GA/SC"
        watchUrl={watch('hvn71J7v1-0')}
        index={2}
        inAoi
        ledStatus="live"
        onSelect={() => {}}
        snapshot={{ src: still('hvn71J7v1-0'), placeholder: 'connecting…', ageLabel: '◐ THUMB 4m', stale: true }}
      />
      <StreamTile
        title="Mikes Weather Page: chasing Isaias"
        watchUrl={watch('xERSsW9bMnI')}
        index={3}
        context
        ledStatus="stale"
        onSelect={() => {}}
        snapshot={{ src: null, placeholder: '◐ STALE' }}
      />
    </div>
  </div>
)

/** Offline and ended thumbnails: ○ OFFLINE placeholder with its badge, and an ENDED still with its THUMB label. */
export const OfflineAndEnded = () => (
  <div style={{ width: 380, padding: 10, background: 'var(--surface-panel)' }}>
    <div className="stream-grid">
      <StreamTile
        title="WRDW News 12 (Augusta TV): Screven County tornado"
        watchUrl={watch('QaOKJLeJwDY')}
        index={4}
        inAoi
        ledStatus="offline"
        statusLabel="OFFLINE"
        onSelect={() => {}}
        snapshot={{ src: null, placeholder: '○ OFFLINE' }}
      />
      <StreamTile
        title="Tornado Paigeyy: GA & SC tornado threat (2026-10-10)"
        watchUrl={watch('4cS5_IGsNnY')}
        index={5}
        inAoi
        ledStatus="offline"
        statusLabel="ENDED"
        onSelect={() => {}}
        snapshot={{ src: still('4cS5_IGsNnY'), placeholder: 'connecting…', ageLabel: 'THUMB ≤5m' }}
      />
    </div>
  </div>
)
