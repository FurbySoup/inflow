import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { FeedResolution } from '../sources/streams/resolve'
import { useLiveness } from '../sources/streams/useLiveness'
import { useStreams } from '../state/streams'
import { StreamTile } from '../ui'
import { StreamsGrid } from './StreamsGrid'

vi.mock('../sources/streams/useLiveness', () => ({
  useLiveness: vi.fn((): Map<string, FeedResolution> => new Map()),
}))
// The roster scheduler would poll the network; the grid only needs its results (WP-36).
vi.mock('../sources/chasers/useRoster', () => ({
  useRoster: () => ({ results: new Map(), passes: 0 }),
}))
vi.mock('../sources/streams/useSnapshots', () => ({
  useSnapshotClock: () => ({ now: 0, refreshedAt: {} }),
}))

const EMBED = 'https://www.youtube.com/embed/abcdefghijk?autoplay=1&mute=1'
const watchButtons = () => screen.queryAllByRole('button', { name: /^▶ WATCH/ })
const stillButtons = () => screen.queryAllByRole('button', { name: /^■ STILL/ })

describe('StreamTile render (kit)', () => {
  afterEach(cleanup)

  it('a still shows ▶ WATCH and ● LIVE, with its THUMB label and no iframe', () => {
    const { container } = render(
      <StreamTile
        title="Feed A"
        index={1}
        liveKind="live"
        onPlay={() => {}}
        onSelect={() => {}}
        snapshot={{ src: null, placeholder: 'connecting…', ageLabel: 'THUMB ≤5m' }}
      />,
    )
    expect(screen.getByRole('button', { name: '▶ WATCH Feed A' })).toBeTruthy()
    expect(screen.getByText('● LIVE')).toBeTruthy()
    expect(screen.getByText('THUMB ≤5m')).toBeTruthy()
    expect(container.querySelector('iframe')).toBeNull()
  })

  it('playing shows an iframe without referrerpolicy, ■ STILL and PLAYING · MUTED', () => {
    const { container } = render(
      <StreamTile
        title="Feed B"
        index={2}
        liveKind="replay"
        playing
        embedUrl={EMBED}
        onStop={() => {}}
        onSelect={() => {}}
      />,
    )
    const frame = container.querySelector('iframe')
    expect(frame).not.toBeNull()
    expect(frame?.hasAttribute('referrerpolicy')).toBe(false)
    expect(frame?.getAttribute('allow')).toBe('autoplay; encrypted-media; picture-in-picture')
    expect(screen.getByRole('button', { name: '■ STILL Feed B' })).toBeTruthy()
    expect(screen.getByText('PLAYING · MUTED')).toBeTruthy()
    expect(screen.getByText('↺ REPLAY')).toBeTruthy()
  })

  it('offline has no WATCH button', () => {
    const { container } = render(
      <StreamTile title="Feed C" index={3} liveKind="offline" onPlay={() => {}} snapshot={{ src: null, placeholder: '○ OFFLINE' }} />,
    )
    expect(screen.queryByRole('button', { name: /WATCH/ })).toBeNull()
    expect(container.querySelector('.stream-live[data-kind="offline"]')?.textContent).toBe('○ OFFLINE')
  })

  it('WATCH and STILL call their handlers', () => {
    const onPlay = vi.fn()
    const onStop = vi.fn()
    const { rerender } = render(<StreamTile title="Feed D" index={4} liveKind="unchecked" onPlay={onPlay} onStop={onStop} />)
    fireEvent.click(screen.getByRole('button', { name: '▶ WATCH Feed D' }))
    expect(onPlay).toHaveBeenCalledTimes(1)
    rerender(<StreamTile title="Feed D" index={4} liveKind="unchecked" playing embedUrl={EMBED} onPlay={onPlay} onStop={onStop} />)
    fireEvent.click(screen.getByRole('button', { name: '■ STILL Feed D' }))
    expect(onStop).toHaveBeenCalledTimes(1)
  })

  it('the caption statusLabel is replaced by the frame live tag', () => {
    render(<StreamTile title="Feed E" index={5} liveKind="replay" statusLabel="ENDED" />)
    expect(screen.queryByText('ENDED')).toBeNull()
    expect(screen.getByText('↺ REPLAY')).toBeTruthy()
  })
})

describe('StreamsGrid playback', () => {
  beforeEach(() => {
    vi.mocked(useLiveness).mockReturnValue(new Map())
    useStreams.setState({ primaryId: null, chosenThisSession: false })
  })
  afterEach(cleanup)

  it('mounts one iframe on load: the primary', () => {
    const { container } = render(<StreamsGrid />)
    expect(container.querySelectorAll('iframe')).toHaveLength(1)
    expect(watchButtons().length).toBeGreaterThan(0)
  })

  it('WATCH plays a thumbnail muted with autoplay, beside the primary', () => {
    const { container } = render(<StreamsGrid />)
    fireEvent.click(watchButtons()[0]!)
    const frames = container.querySelectorAll('iframe')
    expect(frames).toHaveLength(2)
    const params = new URL(frames[1]!.src).searchParams
    expect(params.get('mute')).toBe('1')
    expect(params.get('autoplay')).toBe('1')
    expect(screen.getByText('PLAYING · MUTED')).toBeTruthy()
    expect(stillButtons()).toHaveLength(1)
  })

  it('has no cap: starting a fourth thumbnail keeps the first three playing (user report 2026-10-11)', () => {
    const { container } = render(<StreamsGrid />)
    for (let i = 0; i < 4; i++) fireEvent.click(watchButtons()[0]!)
    expect(container.querySelectorAll('iframe')).toHaveLength(5)
    expect(stillButtons()).toHaveLength(4)
  })

  it('STILL returns a playing thumbnail to its still', () => {
    const { container } = render(<StreamsGrid />)
    fireEvent.click(watchButtons()[0]!)
    fireEvent.click(stillButtons()[0]!)
    expect(container.querySelectorAll('iframe')).toHaveLength(1)
    expect(stillButtons()).toHaveLength(0)
  })

  it('an OFFLINE feed gets no WATCH button', () => {
    vi.mocked(useLiveness).mockReturnValue(
      new Map<string, FeedResolution>([['connor-croff-ga-sc-2026-10-10', { status: 'offline' }]]),
    )
    const { container } = render(<StreamsGrid />)
    expect(screen.queryByRole('button', { name: /WATCH Connor Croff/ })).toBeNull()
    expect(container.querySelector('.stream-live[data-kind="offline"]')).not.toBeNull()
  })

  it('an ENDED pinned feed is labelled REPLAY and can be watched', () => {
    vi.mocked(useLiveness).mockReturnValue(
      new Map<string, FeedResolution>([['tornado-paigeyy-ga-sc-2026-10-10', { status: 'ended' }]]),
    )
    render(<StreamsGrid />)
    expect(screen.getByText('↺ REPLAY')).toBeTruthy()
    expect(screen.getByRole('button', { name: '▶ WATCH Tornado Paigeyy: GA & SC tornado threat (2026-10-10)' })).toBeTruthy()
  })

  it('▲ MAIN on a playing thumbnail promotes it and stops it', () => {
    const { container } = render(<StreamsGrid />)
    fireEvent.click(watchButtons()[0]!)
    const playingTitle = screen.getByRole('button', { name: /^■ STILL/ }).getAttribute('aria-label')?.replace('■ STILL ', '') ?? ''
    fireEvent.click(screen.getByRole('button', { name: `Make ${playingTitle} the main feed` }))
    expect(stillButtons()).toHaveLength(0)
    expect(container.querySelectorAll('iframe')).toHaveLength(1)
  })
})
