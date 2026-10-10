import audio from '../../../config/audio.json'

export interface ScannerSystem {
  shortName: string
  state: string
}

const SYSTEMS: Record<string, string[]> = audio.scannerSystems

/** OpenMHz systems whose state is in the AOI. The systems list endpoint lacks reliable state fields, so this is curated. */
export function scannerSystemsFor(states: string[]): ScannerSystem[] {
  return states.flatMap((state) =>
    (SYSTEMS[state] ?? []).map((shortName) => ({ shortName, state })),
  )
}
