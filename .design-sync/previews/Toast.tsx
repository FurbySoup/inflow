import { Toast } from 'storm-chasers'

const frame = { width: 600, padding: 12, background: 'var(--surface-panel)' } as const

/** New tornado warning in the AOI: TOR chip, countdown, primary FOCUS MAP and quiet DISMISS. */
export const NewWarning = () => (
  <div style={frame}>
    <Toast
      issued="21:46Z"
      title="Tornado Warning"
      area="Screven, GA"
      remainingMs={1_302_000}
      until="22:09Z"
      onFocus={() => {}}
      onDismiss={() => {}}
    />
  </div>
)

/** Particularly dangerous situation: white inset ring on the chip and a PDS badge. */
export const Pds = () => (
  <div style={frame}>
    <Toast
      pds
      issued="21:46Z"
      title="Tornado Warning"
      area="Moore, OK; Norman, OK"
      remainingMs={542_000}
      until="22:09Z"
      onFocus={() => {}}
      onDismiss={() => {}}
    />
  </div>
)

/** Tornado Emergency: EMERGENCY line under the chip. */
export const Emergency = () => (
  <div style={frame}>
    <Toast
      pds
      emergency
      issued="21:46Z"
      title="Tornado Warning"
      area="Hampton, SC; Jasper, SC"
      remainingMs={410_000}
      until="21:53Z"
      onFocus={() => {}}
      onDismiss={() => {}}
    />
  </div>
)

/** No polygon to fly to: FOCUS MAP is shown disabled. */
export const NoFocusTarget = () => (
  <div style={frame}>
    <Toast
      issued="21:46Z"
      title="Tornado Warning"
      area="Bulloch, GA"
      remainingMs={600_000}
      onDismiss={() => {}}
    />
  </div>
)
