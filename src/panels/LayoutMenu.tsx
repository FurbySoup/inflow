import type { CSSProperties } from 'react'
import { PRESETS, useLayout, type PresetName } from '../state/layout'

const button: CSSProperties = {
  fontFamily: 'var(--font-data)',
  fontSize: '0.72rem',
  letterSpacing: '0.08em',
  color: 'var(--accent)',
  background: 'transparent',
  border: '1px solid var(--accent)',
  padding: '2px 8px',
  cursor: 'pointer',
}

const PRESET_NAMES = Object.keys(PRESETS) as PresetName[]

/** Top-bar layout presets (ADR-0011). Applying one replaces the whole layout snapshot. */
export function LayoutMenu() {
  const applyPreset = useLayout((s) => s.applyPreset)

  return (
    <div role="group" aria-label="Layout presets" style={{ display: 'flex', gap: 6 }}>
      {PRESET_NAMES.map((name) => (
        <button
          key={name}
          type="button"
          style={button}
          aria-label={`Apply ${name} layout`}
          onClick={() => applyPreset(name)}
        >
          {name}
        </button>
      ))}
      <button
        type="button"
        style={button}
        aria-label="Reset layout to default"
        onClick={() => applyPreset('DEFAULT')}
      >
        RESET
      </button>
    </div>
  )
}
