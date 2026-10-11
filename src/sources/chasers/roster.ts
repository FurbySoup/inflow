import raw from '../../../config/chasers.json'

export type ChaserKind = 'chaser' | 'coverage'

/** One verified roster entry (config/chasers.json). `states: []` means national: no home region stated. */
export interface Chaser {
  id: string
  name: string
  handle: string
  channelId: string
  kind: ChaserKind
  regions: string[]
  states: string[]
}

export interface ChaserRoster {
  verified: string
  method: string
  chasers: Chaser[]
}

/** Orchestrator-verified data. Never edit a channel ID here by hand (see WP-36). */
export const ROSTER: readonly Chaser[] = (raw as ChaserRoster).chasers
