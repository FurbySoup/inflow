import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { curatedStreams } from '../sources/streams/curated'
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

// A map of liveness results: `live` is always live (so the grid is not in its quiet state), plus any extra entries.
const liveness = (...extra: Array<[string, FeedResolution]>) =>
  new Map<string, FeedResolution>([['livestormsmedia', { status: 'live' }], ...extra])

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
    vi.mocked(useLiveness).mockReturnValue(liveness())
    useStreams.setState({ primaryId: null, chosenThisSession: false })
  })
  afterEach(cleanup)

  it('mounts one iframe on load: the live primary', () => {
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
    vi.mocked(useLiveness).mockReturnValue(liveness(['reedtimmerwx', { status: 'offline' }]))
    const { container } = render(<StreamsGrid />)
    expect(screen.queryByRole('button', { name: /WATCH Reed Timmer/ })).toBeNull()
    expect(container.querySelector('.stream-live[data-kind="offline"]')).not.toBeNull()
  })

  it('an ENDED feed is labelled REPLAY and can be watched', () => {
    vi.mocked(useLiveness).mockReturnValue(liveness(['maxvelocitywx', { status: 'ended' }]))
    render(<StreamsGrid />)
    expect(screen.getByText('↺ REPLAY')).toBeTruthy()
    expect(screen.getByRole('button', { name: '▶ WATCH Max Velocity' })).toBeTruthy()
  })

  it('▲ MAIN on a playing thumbnail promotes it and stops it', () => {
    const { container } = render(<StreamsGrid />)
    fireEvent.click(watchButtons()[0]!)
    const playingTitle = screen.getByRole('button', { name: /^■ STILL/ }).getAttribute('aria-label')?.replace('■ STILL ', '') ?? ''
    fireEvent.click(screen.getByRole('button', { name: `Make ${playingTitle} the main feed` }))
    expect(stillButtons()).toHaveLength(0)
    expect(container.querySelectorAll('iframe')).toHaveLength(1)
  })

  it('hides ▲ MAIN on offline and ended thumbnails, but keeps it on unchecked ones', () => {
    vi.mocked(useLiveness).mockReturnValue(
      liveness(['reedtimmerwx', { status: 'offline' }], ['maxvelocitywx', { status: 'ended' }]),
    )
    render(<StreamsGrid />)
    expect(screen.queryByRole('button', { name: 'Make Reed Timmer the main feed' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Make Max Velocity the main feed' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Make Brandon Copic the main feed' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Make Live Storms Media the main feed' })).toBeTruthy()
  })
})

describe('StreamsGrid quiet day (WP-50)', () => {
  beforeEach(() => {
    vi.mocked(useLiveness).mockReturnValue(new Map())
    useStreams.setState({ primaryId: null, chosenThisSession: false })
  })
  afterEach(cleanup)

  it('with nobody live: no iframe, the slate text, and a ↗ link per curated feed', () => {
    const { container } = render(<StreamsGrid />)
    expect(container.querySelectorAll('iframe')).toHaveLength(0)
    expect(screen.getByText('NO CHASERS LIVE RIGHT NOW')).toBeTruthy()
    expect(screen.getByText(/checks 58 chasers/)).toBeTruthy()
    const links = container.querySelectorAll<HTMLAnchorElement>('.feeds-quiet-list a')
    const curated = curatedStreams.filter((s) => !s.context)
    expect(links).toHaveLength(curated.length)
    links.forEach((a) => {
      expect(a.textContent?.endsWith('↗')).toBe(true)
      expect(a.getAttribute('target')).toBe('_blank')
      expect(a.getAttribute('rel')).toBe('noopener noreferrer')
    })
    expect(links[0]?.getAttribute('href')).toBe(curated[0]?.watchUrl)
  })

  it('with nobody live: no WATCH buttons and no thumbnail grid', () => {
    const { container } = render(<StreamsGrid />)
    expect(watchButtons()).toHaveLength(0)
    expect(container.querySelector('.stream-grid')).toBeNull()
  })

  it('keeps liveness on for the curated feeds while quiet', () => {
    render(<StreamsGrid />)
    const predicate = vi.mocked(useLiveness).mock.calls.at(-1)?.[1]
    expect(predicate?.('ryanhallyall')).toBe(true)
    expect(predicate?.('reedtimmerwx')).toBe(true)
  })

  it('a live feed returns the primary tile with its iframe and the thumbnails', () => {
    vi.mocked(useLiveness).mockReturnValue(liveness())
    const { container } = render(<StreamsGrid />)
    expect(screen.queryByText('NO CHASERS LIVE RIGHT NOW')).toBeNull()
    expect(container.querySelectorAll('iframe')).toHaveLength(1)
    expect(container.querySelector('.stream-grid')).not.toBeNull()
  })

  it('a feed the viewer picked this session keeps its tile even though it is offline', () => {
    useStreams.setState({ primaryId: 'reedtimmerwx', chosenThisSession: true })
    vi.mocked(useLiveness).mockReturnValue(new Map([['reedtimmerwx', { status: 'offline' }]]))
    const { container } = render(<StreamsGrid />)
    expect(screen.queryByText('NO CHASERS LIVE RIGHT NOW')).toBeNull()
    expect(container.querySelectorAll('iframe')).toHaveLength(1)
  })
})
