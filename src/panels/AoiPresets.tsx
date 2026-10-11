import { ConsoleButton } from '../ui'
import { useAoi } from '../state/aoi'
import { AOI_PRESETS, matchPreset } from './aoiPresetData'

/** Top-bar group that flies the map to a named region. The preset matching the current AOI is pressed; a manual pan or zoom un-presses it. */
export function AoiPresets() {
  const bbox = useAoi((s) => s.bbox)
  const requestAoi = useAoi((s) => s.requestAoi)
  const active = matchPreset(bbox)

  // Inline layout only: the group is a flex row, and the buttons keep their console styling.
  return (
    <span role="group" aria-label="Map region presets" style={{ display: 'inline-flex', gap: 4 }}>
      {AOI_PRESETS.map((p) => (
        <ConsoleButton
          key={p.id}
          title={p.title}
          pressed={active === p.id}
          onClick={() => requestAoi(p.bbox)}
        >
          {p.label}
        </ConsoleButton>
      ))}
    </span>
  )
}
