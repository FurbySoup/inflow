/** True while an ISO expiry time is still in the future relative to `now` (epoch ms). Unparseable times count as expired. */
export function isActive(expires: string, now: number): boolean {
  const t = Date.parse(expires)
  return Number.isFinite(t) && t > now
}
