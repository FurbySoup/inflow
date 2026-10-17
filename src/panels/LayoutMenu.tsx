import { PRESETS, useLayout, type PresetName } from '../state/layout'
import { ConsoleButton } from '../ui'

const PRESET_NAMES = Object.keys(PRESETS) as PresetName[]

/** Hover and touch-hold tips for each preset (WP-52). The accessible name stays the aria-label. */
const PRESET_TITLES: Record<PresetName, string> = {
  DEFAULT: 'Everything on one screen',
  WALL: 'Map, warnings and video, sized for a TV or second monitor',
  CHASE: 'One stream, radio and warnings, for a laptop in the car',
}
const RESET_TITLE = 'Reset sizes to DEFAULT'

/**
 * Top-bar layout presets (ADR-0011). Applying one replaces the whole layout snapshot.
 * Affordance: press to apply. Signifier: outlined accent buttons, RESET included. Feedback: the applied preset
 * is the solid-filled pressed button (aria-pressed), and it persists across reloads.
 * At the ≤ 900 px tier the LAYOUT label heads the group inside the MORE popover; above it the label is hidden (CSS).
 */
export function LayoutMenu() {
  const preset = useLayout((s) => s.preset)
  const applyPreset = useLayout((s) => s.applyPreset)

  return (
    <>
      <span className="topbar-more-label">LAYOUT</span>
      <div role="group" aria-label="Layout presets" style={{ display: 'flex', gap: 6 }}>
        {PRESET_NAMES.map((name) => (
          <ConsoleButton
            key={name}
            aria-label={`Apply ${name} layout`}
            title={PRESET_TITLES[name]}
            pressed={preset === name}
            onClick={() => applyPreset(name)}
          >
            {name}
          </ConsoleButton>
        ))}
        <ConsoleButton
          aria-label="Reset layout to default"
          title={RESET_TITLE}
          onClick={() => applyPreset('DEFAULT')}
        >
          RESET
        </ConsoleButton>
      </div>
    </>
  )
}
