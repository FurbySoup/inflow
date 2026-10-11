import { describe, expect, it } from 'vitest'
import { buildGlossaryGroups, countEntries, filterGroups, matchesQuery, type HelpGroup } from './helpSearch'

const GROUPS: HelpGroup[] = [
  {
    group: 'Tornadoes',
    terms: [
      { term: 'RFD', stands: 'Rear-flank downdraft', meaning: 'Air descending on the back side of a supercell.' },
      { term: 'Wedge', meaning: 'A tornado at least as wide as it is tall.' },
    ],
  },
  {
    group: 'Radio',
    terms: [{ term: 'CB', stands: 'Citizens Band', meaning: 'Channel 19 is the truckers channel.' }],
  },
]

describe('matchesQuery', () => {
  const rfd = GROUPS[0]!.terms[0]!

  it('matches the term, the stands text and the meaning', () => {
    expect(matchesQuery(rfd, 'rfd')).toBe(true)
    expect(matchesQuery(rfd, 'flank')).toBe(true)
    expect(matchesQuery(rfd, 'supercell')).toBe(true)
  })

  it('is case-insensitive and ignores surrounding spaces', () => {
    expect(matchesQuery(rfd, 'RFD')).toBe(true)
    expect(matchesQuery(rfd, '  REAR-FLANK  ')).toBe(true)
  })

  it('rejects text found in none of the fields, and an empty query matches everything', () => {
    expect(matchesQuery(rfd, 'hail')).toBe(false)
    expect(matchesQuery(rfd, '')).toBe(true)
    expect(matchesQuery(rfd, '   ')).toBe(true)
  })
})

describe('filterGroups', () => {
  it('returns every group and entry for an empty query', () => {
    expect(filterGroups(GROUPS, '')).toEqual(GROUPS)
    expect(countEntries(filterGroups(GROUPS, ''))).toBe(3)
  })

  it('keeps only matching entries and drops groups left empty', () => {
    const out = filterGroups(GROUPS, 'wedge')
    expect(out).toEqual([{ group: 'Tornadoes', terms: [GROUPS[0]!.terms[1]] }])
  })

  it('returns no groups when nothing matches', () => {
    expect(filterGroups(GROUPS, 'zzz-no-match')).toEqual([])
  })

  it('does not mutate the input groups', () => {
    const before = JSON.stringify(GROUPS)
    filterGroups(GROUPS, 'cb')
    expect(JSON.stringify(GROUPS)).toBe(before)
  })
})

describe('buildGlossaryGroups', () => {
  const glossary = { AOI: 'Area of interest', TOR: 'Tornado warning', NEWONE: 'Not in the map yet' }
  const map = [
    { group: 'Area', terms: ['AOI', 'UTC'] },
    { group: 'Alerts', terms: ['TOR'] },
    { group: 'Empty', terms: ['MISSING'] },
  ]

  it('places mapped terms under their group, skipping terms the glossary lacks', () => {
    const out = buildGlossaryGroups(glossary, map)
    expect(out.map((g) => g.group)).toEqual(['Area', 'Alerts', 'Other'])
    expect(out[0]?.terms).toEqual([{ term: 'AOI', meaning: 'Area of interest' }])
  })

  it('puts glossary terms missing from the map under Other', () => {
    const other = buildGlossaryGroups(glossary, map).find((g) => g.group === 'Other')
    expect(other?.terms).toEqual([{ term: 'NEWONE', meaning: 'Not in the map yet' }])
  })

  it('omits Other when every term is mapped', () => {
    const out = buildGlossaryGroups({ AOI: 'x' }, [{ group: 'Area', terms: ['AOI'] }])
    expect(out.map((g) => g.group)).toEqual(['Area'])
  })
})
