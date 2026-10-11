import { useId, useState, type CSSProperties } from 'react'
import { useSource } from '../lib/useSource'
import { nwsHwo } from '../sources/nws/hwo'
import { Abbr, ConsoleButton } from '../ui'

const pad2 = (n: number) => String(n).padStart(2, '0')
const hhmm = (ms: number) => {
  const d = new Date(ms)
  return `${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}`
}
const paragraphs = (text: string) => (text ? text.split('\n\n') : [])

const toggleStyle: CSSProperties = { display: 'block', width: '100%', textAlign: 'left', whiteSpace: 'normal' }
const bodyStyle: CSSProperties = {
  margin: 0,
  font: '400 var(--fs-ui-m) / 1.4 var(--font-ui)',
  color: 'var(--text-primary)',
}
const mutedStyle: CSSProperties = {
  margin: 0,
  font: '400 var(--fs-ui-s) / 1.4 var(--font-ui)',
  color: 'var(--text-muted)',
}

/**
 * The local NWS office's Hazardous Weather Outlook, shown above the alerts (WX-02). Collapsed it is one line; the
 * toggle is a console button with a ▸/▾ glyph (ADR-0012). Loading shows nothing; an office with no HWO shows nothing;
 * a failed request shows a muted HWO UNAVAILABLE (the alerts feed has its own status light).
 */
export function HwoStrip() {
  const query = useSource(nwsHwo)
  const [open, setOpen] = useState(false)
  const id = useId()
  const hwo = query.data?.[0]

  if (!hwo) {
    return query.isError ? <p style={{ ...mutedStyle, padding: 'var(--sp-3) var(--sp-4)' }}>HWO UNAVAILABLE</p> : null
  }

  return (
    <section
      aria-label="Hazardous Weather Outlook"
      style={{
        padding: 'var(--sp-3) var(--sp-4)',
        borderBottom: '1px solid var(--border-default)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--sp-3)',
      }}
    >
      <ConsoleButton
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        style={toggleStyle}
      >
        {open ? '▾' : '▸'} <Abbr term="HWO" /> · <Abbr term={hwo.cwa} title="NWS office" /> · ISSUED {hhmm(hwo.issued)}
        <Abbr term="Z" />
        {hwo.spotterActivation !== null && (
          <> · SPOTTERS: {hwo.spotterActivation ? 'NEEDED' : 'NOT NEEDED'}</>
        )}
      </ConsoleButton>
      {open && (
        <div id={id} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          {paragraphs(hwo.dayOne).map((p, i) => (
            <p key={i} style={bodyStyle}>
              {p}
            </p>
          ))}
          {paragraphs(hwo.daysTwoToSeven).map((p, i) => (
            <p key={`d${i}`} style={mutedStyle}>
              {p}
            </p>
          ))}
          <a
            className="btn-console"
            href={hwo.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ alignSelf: 'flex-start' }}
          >
            FULL TEXT ↗
          </a>
        </div>
      )}
    </section>
  )
}
