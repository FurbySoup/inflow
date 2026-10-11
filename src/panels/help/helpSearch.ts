// Pure search and grouping for the help dialog (WP-40). No React, no app state.

/** One searchable help entry: a term, optionally what it stands for, and its meaning. */
export interface HelpEntry {
  term: string
  stands?: string
  meaning: string
}

export interface HelpGroup<T extends HelpEntry = HelpEntry> {
  group: string
  terms: readonly T[]
}

function normalise(query: string): string {
  return query.trim().toLowerCase()
}

/** True when the query is empty, or appears in the term, what it stands for, or its meaning (case-insensitive). */
export function matchesQuery(entry: HelpEntry, query: string): boolean {
  const q = normalise(query)
  if (!q) return true
  return [entry.term, entry.stands ?? '', entry.meaning].some((text) => text.toLowerCase().includes(q))
}

/**
 * The groups with only the entries that match. An empty query returns the groups unchanged; otherwise groups
 * left with no matches are dropped.
 */
export function filterGroups<T extends HelpEntry>(groups: readonly HelpGroup<T>[], query: string): HelpGroup<T>[] {
  if (!normalise(query)) return groups.map((g) => ({ group: g.group, terms: g.terms }))
  return groups
    .map((g) => ({ group: g.group, terms: g.terms.filter((t) => matchesQuery(t, query)) }))
    .filter((g) => g.terms.length > 0)
}

/** Total number of entries across groups (used for the "N MATCHES" count). */
export function countEntries(groups: readonly HelpGroup<HelpEntry>[]): number {
  return groups.reduce((n, g) => n + g.terms.length, 0)
}

/**
 * Builds display groups from a glossary (term to meaning) and a static map of group name to terms. Map terms
 * missing from the glossary are skipped. Glossary terms in no map group go into `otherGroup`, so a new term is
 * never lost. Empty groups are dropped.
 */
export function buildGlossaryGroups(
  glossary: Readonly<Record<string, string>>,
  map: readonly { group: string; terms: readonly string[] }[],
  otherGroup = 'Other',
): HelpGroup<HelpEntry>[] {
  const placed = new Set<string>()
  const groups: HelpGroup<HelpEntry>[] = []
  for (const { group, terms } of map) {
    const entries: HelpEntry[] = []
    for (const term of terms) {
      const meaning = glossary[term]
      if (meaning === undefined || placed.has(term)) continue
      placed.add(term)
      entries.push({ term, meaning })
    }
    if (entries.length > 0) groups.push({ group, terms: entries })
  }
  const rest = Object.keys(glossary)
    .filter((term) => !placed.has(term))
    .map((term) => ({ term, meaning: glossary[term] ?? '' }))
  if (rest.length > 0) groups.push({ group: otherGroup, terms: rest })
  return groups
}
