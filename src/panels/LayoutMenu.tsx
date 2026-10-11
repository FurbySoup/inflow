import { PRESETS, useLayout, type PresetName } from '../state/layout'
import { ConsoleButton } from '../ui'

const PRESET_NAMES = Object.keys(PRESETS) as PresetName[]

/**
 * Top-bar layout presets (ADR-0011). Applying one replaces the whole layout snapshot.
 * Affordance: press to apply. Signifier: outlined accent buttons. Feedback: the applied preset
 * is the solid-filled pressed button (aria-pressed), and it persists across reloads.
 */
export function LayoutMenu() {
  const preset = useLayout((s) => s.preset)
  const applyPreset = useLayout((s) => s.applyPreset)

  return (
    <div role="group" aria-label="Layout presets" style={{ display: 'flex', gap: 6 }}>
      {PRESET_NAMES.map((name) => (
        <ConsoleButton
          key={name}
          aria-label={`Apply ${name} layout`}
          pressed={preset === name}
          onClick={() => applyPreset(name)}
        >
          {name}
        </ConsoleButton>
      ))}
      <ConsoleButton variant="quiet" aria-label="Reset layout to default" onClick={() => applyPreset('DEFAULT')}>
        RESET
      </ConsoleButton>
    </div>
  )
}
