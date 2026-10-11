import { Abbr, ConsoleButton } from '../ui'
import { useAoi } from '../state/aoi'
import { AOI_PRESETS, matchPreset, type AoiPresetId } from './aoiPresetData'

// Tips for the preset labels (ADR-0018). Until the glossary carries them, these are passed explicitly.
const PRESET_TIPS: Readonly<Record<AoiPresetId, string>> = {
  southeast: 'Southeast: Georgia and South Carolina, the default area',
  dixie: 'Dixie Alley: the tornado-prone Deep South (LA, MS, AL, TN)',
  plains: 'Plains: the Great Plains, from the Texas panhandle to Nebraska',
}

/** Top-bar group that flies the map to a named region. The preset matching the current AOI is pressed; a manual pan or zoom un-presses it. */
export function AoiPresets() {
  const bbox = useAoi((s) => s.bbox)
  const requestAoi = useAoi((s) => s.requestAoi)
  const active = matchPreset(bbox)

  return (
    <span role="group" aria-label="Map region presets" className="aoi-presets">
      {AOI_PRESETS.map((p) => (
        <ConsoleButton
          key={p.id}
          title={p.title}
          pressed={active === p.id}
          onClick={() => requestAoi(p.bbox)}
        >
          <Abbr term={p.label} title={PRESET_TIPS[p.id]} />
        </ConsoleButton>
      ))}
    </span>
  )
}
