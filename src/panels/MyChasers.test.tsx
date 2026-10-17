import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ROSTER } from '../sources/chasers/roster'
import { resolveChannel, type ResolveResult } from '../sources/chasers/resolveChannel'
import { checkNow } from '../sources/chasers/useRoster'
import { useMyChasers, type MyChaser } from '../state/myChasers'
import { MyChasers } from './MyChasers'

vi.mock('../sources/chasers/resolveChannel', () => ({
  resolveChannel: vi.fn(),
}))
vi.mock('../sources/chasers/useRoster', () => ({
  checkNow: vi.fn(() => Promise.resolve()),
}))

const CH = `UC${'b'.repeat(22)}`
const NAME = 'Test Chaser'
const HANDLE = '@TestChaser'
const found: ResolveResult = { ok: true, channel: { channelId: CH, name: NAME, handle: HANDLE } }
const INPUT_LABEL = 'YouTube channel or video link, or @handle'

const stored = (overrides: Partial<MyChaser> = {}): MyChaser => ({
  channelId: CH,
  name: NAME,
  handle: HANDLE,
  states: [],
  addedAt: 1,
  ...overrides,
})

const toggle = () => screen.getByRole('button', { name: '+ CHASER' })
const input = () => screen.getByLabelText(INPUT_LABEL)

function openAndFind(text: string) {
  fireEvent.click(toggle())
  fireEvent.change(input(), { target: { value: text } })
  fireEvent.click(screen.getByRole('button', { name: 'FIND' }))
}

describe('MyChasers', () => {
  beforeEach(() => {
    localStorage.clear()
    useMyChasers.setState({ chasers: [] })
    vi.mocked(resolveChannel).mockReset()
    vi.mocked(checkNow).mockClear()
  })
  afterEach(cleanup)

  it('the disclosure opens and closes the inline form', () => {
    render(<MyChasers />)
    expect(toggle().getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByLabelText(INPUT_LABEL)).toBeNull()

    fireEvent.click(toggle())
    expect(toggle().getAttribute('aria-expanded')).toBe('true')
    expect(toggle().getAttribute('aria-controls')).toBe(input().closest('.my-chasers-panel')?.id)
    expect(screen.getByRole('combobox', { name: 'Home state' })).toBeTruthy()

    fireEvent.click(toggle())
    expect(screen.queryByLabelText(INPUT_LABEL)).toBeNull()
  })

  it('renders only the button when the list is empty and the form is closed', () => {
    const { container } = render(<MyChasers />)
    expect(container.querySelector('.my-chasers-list')).toBeNull()
    expect(container.querySelectorAll('button').length).toBe(1)
  })

  it('FIND shows the channel name, and ADD stores it with the home state and asks for a check', async () => {
    vi.mocked(resolveChannel).mockResolvedValueOnce(found)
    render(<MyChasers />)
    openAndFind('youtube.com/@TestChaser')
    expect(await screen.findByText(NAME)).toBeTruthy()
    expect(screen.getByText(HANDLE)).toBeTruthy()
    expect(resolveChannel).toHaveBeenCalledWith('youtube.com/@TestChaser', expect.any(AbortSignal))

    fireEvent.change(screen.getByRole('combobox', { name: 'Home state' }), { target: { value: 'GA' } })
    fireEvent.click(screen.getByRole('button', { name: 'ADD' }))

    expect(useMyChasers.getState().chasers).toEqual([
      expect.objectContaining({ channelId: CH, name: NAME, handle: HANDLE, states: ['GA'] }),
    ])
    expect(checkNow).toHaveBeenCalledWith(CH)
    expect(screen.getByText('Added. It appears in the feeds when it goes live.')).toBeTruthy()
    expect(screen.getByText('YOUR CHASERS (1)')).toBeTruthy()
    expect((input() as HTMLInputElement).value).toBe('')
  })

  it('FIND is disabled and reads FINDING… while busy', async () => {
    let finish: (r: ResolveResult) => void = () => {}
    vi.mocked(resolveChannel).mockReturnValueOnce(new Promise((resolve) => (finish = resolve)))
    render(<MyChasers />)
    openAndFind('@TestChaser')
    const busy = await screen.findByRole('button', { name: 'FINDING…' })
    expect((busy as HTMLButtonElement).disabled).toBe(true)
    await act(async () => finish(found))
    expect(await screen.findByRole('button', { name: 'FIND' })).toBeTruthy()
  })

  it.each([
    ['unrecognised', 'Paste a youtube.com channel or video link, or an @handle.'],
    ['not-found', 'YouTube has no channel at that address.'],
    ['unreachable', "Couldn't reach YouTube. Try again in a minute."],
  ] as const)('a %s failure shows its one line and adds nothing', async (reason, text) => {
    vi.mocked(resolveChannel).mockResolvedValueOnce({ ok: false, reason })
    render(<MyChasers />)
    openAndFind('whatever')
    expect(await screen.findByText(text)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'ADD' })).toBeNull()
    expect(useMyChasers.getState().chasers).toEqual([])
  })

  it('a channel already on the built-in roster is not added', async () => {
    const rosterChannel = ROSTER[0]?.channelId ?? ''
    vi.mocked(resolveChannel).mockResolvedValueOnce({
      ok: true,
      channel: { channelId: rosterChannel, name: 'Roster Chaser', handle: '' },
    })
    render(<MyChasers />)
    openAndFind('@RosterChaser')
    expect(await screen.findByText('Already on the built-in list.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'ADD' })).toBeNull()
    expect(useMyChasers.getState().chasers).toEqual([])
  })

  it('a channel already in the viewer list is not added twice', async () => {
    useMyChasers.setState({ chasers: [stored()] })
    vi.mocked(resolveChannel).mockResolvedValueOnce(found)
    render(<MyChasers />)
    openAndFind('@TestChaser')
    expect(await screen.findByText('Already added.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'ADD' })).toBeNull()
    expect(useMyChasers.getState().chasers).toHaveLength(1)
    expect(checkNow).not.toHaveBeenCalled()
  })

  it('REMOVE drops the chaser at once, with no confirmation', () => {
    useMyChasers.setState({ chasers: [stored()] })
    render(<MyChasers />)
    expect(screen.getByText('YOUR CHASERS (1)')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: `Remove ${NAME}` }))
    expect(useMyChasers.getState().chasers).toEqual([])
    expect(screen.queryByText('YOUR CHASERS (1)')).toBeNull()
  })

  it('Escape closes the form and returns focus to + CHASER', () => {
    render(<MyChasers />)
    fireEvent.click(toggle())
    fireEvent.keyDown(input(), { key: 'Escape' })
    expect(screen.queryByLabelText(INPUT_LABEL)).toBeNull()
    expect(document.activeElement).toBe(toggle())
  })

  it('a FIND still running when the form closes is abandoned', async () => {
    vi.mocked(resolveChannel).mockImplementationOnce(
      (_text, signal) =>
        new Promise((_resolve, reject) => {
          signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
        }),
    )
    render(<MyChasers />)
    openAndFind('@TestChaser')
    await screen.findByRole('button', { name: 'FINDING…' })
    fireEvent.click(toggle())
    await waitFor(() => expect(screen.queryByLabelText(INPUT_LABEL)).toBeNull())
    expect(screen.queryByText('Couldn\'t reach YouTube. Try again in a minute.')).toBeNull()
    expect(useMyChasers.getState().chasers).toEqual([])
  })
})
