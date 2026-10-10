import { ConsoleButton } from 'storm-chasers'

const bar = { display: 'flex', gap: 6, alignItems: 'center', padding: 10, background: 'var(--panel-head)' } as const

/** Layout preset group from the top bar, with the active preset pressed and a quiet reset. */
export const PresetGroup = () => (
  <div style={bar} role="group" aria-label="Layout presets">
    <ConsoleButton pressed>DEFAULT</ConsoleButton>
    <ConsoleButton>WALL</ConsoleButton>
    <ConsoleButton>CHASE</ConsoleButton>
    <ConsoleButton variant="quiet">RESET</ConsoleButton>
  </div>
)

/** Variants and states. */
export const States = () => (
  <div style={bar}>
    <ConsoleButton>PLAY LATEST</ConsoleButton>
    <ConsoleButton pressed>CB 19</ConsoleButton>
    <ConsoleButton variant="quiet">CLOSE</ConsoleButton>
    <ConsoleButton disabled>2M</ConsoleButton>
  </div>
)
