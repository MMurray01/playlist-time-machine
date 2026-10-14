import { decadeOf } from "@/lib/playlist/decade"
import type { ArtistTally, ChartHit, LongestRun, YearFacts, YearStory } from "@/lib/playlist/types"

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? ""
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`
}

export function collectYearFacts(year: number, hits: ChartHit[]): YearFacts {
  const withWeeks = hits.filter(
    (hit): hit is ChartHit & { weeksAtNumberOne: number } =>
      typeof hit.weeksAtNumberOne === "number" && hit.weeksAtNumberOne > 0,
  )
  const longestWeeks = withWeeks.reduce((max, hit) => Math.max(max, hit.weeksAtNumberOne), 0)
  const longestRuns: LongestRun[] =
    longestWeeks > 0
      ? withWeeks
          .filter((hit) => hit.weeksAtNumberOne === longestWeeks)
          .map((hit) => ({ title: hit.title, artist: hit.artist, weeks: hit.weeksAtNumberOne }))
      : []

  const byArtist = new Map<string, ArtistTally>()
  for (const hit of hits) {
    const current = byArtist.get(hit.artist) ?? { artist: hit.artist, hitCount: 0, weeks: 0 }
    current.hitCount += 1
    current.weeks += hit.weeksAtNumberOne ?? 0
    byArtist.set(hit.artist, current)
  }

  const topArtists = [...byArtist.values()].sort(
    (a, b) => b.hitCount - a.hitCount || b.weeks - a.weeks || a.artist.localeCompare(b.artist),
  )

  return {
    year,
    hitCount: hits.length,
    longestRuns,
    topArtists,
  }
}

function holdPhrase(run: { title: string; artist: string }, weeks: number): string {
  const weekWord = weeks === 1 ? "week" : "weeks"
  return `${run.title} by ${run.artist} holds No. 1 for ${weeks} ${weekWord}`
}

/**
 * One scene built only from the rows: who opens the year, who holds No. 1
 * the longest, and who has the most No. 1s. It does not add outside history.
 */
export function describeYear(
  facts: YearFacts,
  opener?: { title: string; artist: string } | null,
): string {
  if (facts.hitCount === 0) {
    return `${facts.year} has no No. 1 hits in the chart library.`
  }

  const leaders = facts.longestRuns
  if (leaders.length === 0) {
    const count = facts.hitCount === 1 ? "one song reaches" : `${facts.hitCount} songs reach`
    return `In ${facts.year}, ${count} No. 1.`
  }

  const weeks = leaders[0]!.weeks
  const named = leaders.slice(0, 2)
  const extra = leaders.length - named.length
  const lead =
    named.length === 1
      ? holdPhrase(named[0]!, weeks)
      : `${named.map((run) => `${run.title} by ${run.artist}`).join(" and ")} each hold No. 1 for ${weeks} ${weeks === 1 ? "week" : "weeks"}`
  const ending = named.length === 1 ? "the longest run of the year" : "the longest runs of the year"
  const more = extra > 0 ? `, along with ${extra} more,` : ","
  const opens =
    opener && !named.some((run) => run.title === opener.title && run.artist === opener.artist)
      ? ` The year opens with ${opener.title} by ${opener.artist}.`
      : ""

  const topCount = facts.topArtists[0]?.hitCount ?? 0
  let artistLine = ""
  if (topCount >= 2) {
    const top = facts.topArtists.filter((artist) => artist.hitCount === topCount).slice(0, 2)
    const names = joinNames(top.map((artist) => artist.artist))
    artistLine =
      top.length === 1
        ? ` ${names} has ${topCount} No. 1s.`
        : ` ${names} each have ${topCount} No. 1s.`
  }

  return `In ${facts.year}, ${lead}${more} ${ending}.${opens}${artistLine}`
}

export function deriveYearStory(year: number, hits: ChartHit[], editorial: string | null = null): YearStory {
  const facts = collectYearFacts(year, hits)
  const note = editorial?.trim() ? editorial.trim() : null
  return {
    year,
    decade: decadeOf(year),
    facts,
    summary: describeYear(facts, hits[0] ? { title: hits[0].title, artist: hits[0].artist } : null),
    editorial: note,
  }
}
