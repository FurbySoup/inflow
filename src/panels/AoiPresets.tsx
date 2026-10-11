import { Abbr, ConsoleButton, expand } from '../ui'
import { useAoi } from '../state/aoi'
import { AOI_PRESETS, matchPreset } from './aoiPresetData'

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
          // One description per preset (ADR-0018): the glossary entry, on the whole button and on the label.
          title={expand(p.label) ?? p.title}
          pressed={active === p.id}
          onClick={() => requestAoi(p.bbox)}
        >
          <Abbr term={p.label} />
        </ConsoleButton>
      ))}
    </span>
  )
}
