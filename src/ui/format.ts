/** `T-mm:ss` countdown for a remaining duration in ms (floored, never negative). */
export function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const mm = Math.floor(totalSeconds / 60)
  const ss = totalSeconds % 60
  return `T-${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}
