import { describe, expect, it } from 'vitest'
import { CHASER_TERMS } from './chaserTerms'

describe('CHASER_TERMS', () => {
  const all = CHASER_TERMS.flatMap((g) => g.terms)

  it('has unique terms with a one- or two-sentence meaning', () => {
    expect(new Set(all.map((t) => t.term.toLowerCase())).size).toBe(all.length)
    for (const t of all) {
      expect(t.meaning.trim().length).toBeGreaterThan(10)
      expect(t.meaning.split(/[.!?](\s|$)/).filter((s) => s && s.trim()).length).toBeLessThanOrEqual(4)
    }
  })

  it('groups every term', () => {
    expect(CHASER_TERMS.every((g) => g.group && g.terms.length > 0)).toBe(true)
    expect(all.length).toBeGreaterThan(60)
  })
})
