import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'

import { STATE_CODES } from '../lib/states'
import { ROSTER } from '../sources/chasers/roster'
import { checkNow } from '../sources/chasers/useRoster'
import {
  resolveChannel,
  type ResolveFailure,
  type ResolveResult,
  type ResolvedChannel,
} from '../sources/chasers/resolveChannel'
import { MAX_MY_CHASERS, useMyChasers } from '../state/myChasers'
import { ConsoleButton } from '../ui'
import './my-chasers.css'

// WP-48. Affordance: "+ CHASER" discloses an inline form (not a modal). Signifier: the outlined console button, solid
// while open (aria-expanded). Feedback: FIND shows FINDING… while busy, then the channel name with ADD and CANCEL, or one
// line of error text. ADD confirms in a status line, asks for an immediate check and clears the input. Escape closes the
// form and returns focus to the button. Stored per browser via useMyChasers; REMOVE is one click, with no confirmation.

const FAILURE_TEXT: Record<ResolveFailure, string> = {
  unrecognised: 'Paste a youtube.com channel or video link, or an @handle.',
  'not-found': 'YouTube has no channel at that address.',
  unreachable: "Couldn't reach YouTube. Try again in a minute.",
}

interface Message {
  tone: 'error' | 'status'
  text: string
}

export function MyChasers() {
  const chasers = useMyChasers((s) => s.chasers)
  const remove = useMyChasers((s) => s.remove)
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [home, setHome] = useState('')
  const [busy, setBusy] = useState(false)
  const [found, setFound] = useState<ResolvedChannel | null>(null)
  const [message, setMessage] = useState<Message | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const toggleId = useId()
  const formId = useId()
  const inputId = useId()
  const homeId = useId()

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  // A FIND still in flight when the panel unmounts is abandoned.
  useEffect(() => () => abortRef.current?.abort(), [])

  const close = () => {
    abortRef.current?.abort()
    abortRef.current = null
    setBusy(false)
    setOpen(false)
    setText('')
    setHome('')
    setFound(null)
    setMessage(null)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Escape') return
    e.stopPropagation()
    close()
    document.getElementById(toggleId)?.focus()
  }

  const find = async () => {
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setBusy(true)
    setFound(null)
    setMessage(null)
    let result: ResolveResult
    try {
      result = await resolveChannel(text, ctrl.signal)
    } catch {
      // Only an abort (the panel closed) reaches here: resolveChannel rethrows aborts, so nothing is shown.
      if (ctrl.signal.aborted) return
      result = { ok: false, reason: 'unreachable' }
    }
    if (abortRef.current !== ctrl) return
    abortRef.current = null
    setBusy(false)
    if (!result.ok) {
      setMessage({ tone: 'error', text: FAILURE_TEXT[result.reason] })
      return
    }
    const channel = result.channel
    if (ROSTER.some((c) => c.channelId === channel.channelId)) {
      setMessage({ tone: 'status', text: 'Already on the built-in list.' })
      return
    }
    if (useMyChasers.getState().chasers.some((c) => c.channelId === channel.channelId)) {
      setMessage({ tone: 'status', text: 'Already added.' })
      return
    }
    setFound(channel)
  }

  const add = () => {
    if (found === null) return
    const status = useMyChasers.getState().add({
      channelId: found.channelId,
      name: found.name,
      handle: found.handle,
      states: home === '' ? [] : [home],
      addedAt: Date.now(),
    })
    setFound(null)
    if (status === 'added') {
      void checkNow(found.channelId)
      setText('')
      setMessage({ tone: 'status', text: 'Added. It appears in the feeds when it goes live.' })
      inputRef.current?.focus()
      return
    }
    if (status === 'duplicate') setMessage({ tone: 'status', text: 'Already added.' })
    else if (status === 'full') setMessage({ tone: 'error', text: `Your list is full (${MAX_MY_CHASERS} channels).` })
    else setMessage({ tone: 'error', text: "Couldn't add that channel." })
  }

  const cancel = () => {
    setFound(null)
    setMessage(null)
    inputRef.current?.focus()
  }

  return (
    <div className="my-chasers">
      <ConsoleButton
        id={toggleId}
        className="my-chasers-toggle"
        aria-expanded={open}
        aria-controls={open ? formId : undefined}
        onClick={() => (open ? close() : setOpen(true))}
      >
        + CHASER
      </ConsoleButton>
      {open && (
        <div id={formId} className="my-chasers-panel" onKeyDown={onKeyDown}>
          <form
            className="my-chasers-form"
            onSubmit={(e) => {
              e.preventDefault()
              if (!busy) void find()
            }}
          >
            <label className="my-chasers-field my-chasers-field-wide" htmlFor={inputId}>
              <span>YouTube channel or video link, or @handle</span>
              <input
                id={inputId}
                ref={inputRef}
                className="my-chasers-input"
                type="text"
                value={text}
                autoComplete="off"
                spellCheck={false}
                onChange={(e) => {
                  setText(e.target.value)
                  setFound(null)
                  setMessage(null)
                }}
              />
            </label>
            <label className="my-chasers-field" htmlFor={homeId}>
              <span>Home state</span>
              <select
                id={homeId}
                className="my-chasers-select"
                value={home}
                onChange={(e) => setHome(e.target.value)}
              >
                <option value="">Anywhere (national)</option>
                {STATE_CODES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </label>
            <ConsoleButton type="submit" disabled={busy}>
              {busy ? 'FINDING…' : 'FIND'}
            </ConsoleButton>
          </form>
          {found !== null && (
            <div className="my-chasers-found">
              <span className="my-chasers-name">{found.name}</span>
              {found.handle !== '' && <span className="my-chasers-handle">{found.handle}</span>}
              <ConsoleButton onClick={add}>ADD</ConsoleButton>
              <ConsoleButton onClick={cancel}>CANCEL</ConsoleButton>
            </div>
          )}
          {message !== null && (
            <p role="status" className={message.tone === 'error' ? 'error my-chasers-message' : 'my-chasers-message muted'}>
              {message.text}
            </p>
          )}
        </div>
      )}
      {chasers.length > 0 && (
        <div className="my-chasers-list">
          <p className="my-chasers-heading">{`YOUR CHASERS (${chasers.length})`}</p>
          <ul className="my-chasers-items">
            {chasers.map((c) => (
              <li key={c.channelId} className="my-chasers-item">
                <span>
                  <span className="my-chasers-name">{c.name}</span>
                  {c.handle !== '' && <span className="my-chasers-handle">{` ${c.handle}`}</span>}
                </span>
                <ConsoleButton aria-label={`Remove ${c.name}`} onClick={() => remove(c.channelId)}>
                  REMOVE
                </ConsoleButton>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
