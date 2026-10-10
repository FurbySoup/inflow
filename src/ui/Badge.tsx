import type { ReactNode } from 'react'

export type BadgeVariant = 'aoi' | 'ctx' | 'zone' | 'pds'

export interface BadgeProps {
  /** `aoi` accent "in area of interest", `ctx` muted context feed, `zone` muted zone-based alert, `pds` red particularly-dangerous-situation. */
  variant: BadgeVariant
  /** Defaults to the variant's standard label (IN AOI / CTX / ZONE / PDS). */
  children?: ReactNode
}

const LABELS: Record<BadgeVariant, string> = { aoi: 'IN AOI', ctx: 'CTX', zone: 'ZONE', pds: 'PDS' }

/** Small outlined monospace tag for status labels on tiles and alert rows. */
export function Badge({ variant, children }: BadgeProps) {
  return <span className={`badge badge-${variant}`}>{children ?? LABELS[variant]}</span>
}
