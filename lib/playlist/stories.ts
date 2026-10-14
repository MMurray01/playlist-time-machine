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

export function describeYear(facts: YearFacts): string {
  if (facts.hitCount === 0) {
    return `${facts.year} has no No. 1 hits in the chart library.`
  }

  const reached = facts.hitCount === 1 ? "1 song reached" : `${facts.hitCount} songs reached`
  const parts = [`${facts.year}: ${reached} No. 1.`]

  if (facts.longestRuns.length > 0) {
    const weeks = facts.longestRuns[0].weeks
    const weekWord = weeks === 1 ? "week" : "weeks"
    if (weeks <= 1 && facts.longestRuns.length > 3) {
      parts.push("No song is listed with more than 1 week at No. 1.")
    } else {
      const named = facts.longestRuns.slice(0, 3).map((run) => `${run.title} by ${run.artist}`)
      const extra = facts.longestRuns.length - named.length
      const names = `${joinNames(named)}${extra > 0 ? ` and ${extra} more` : ""}`
      if (named.length === 1 && extra === 0) {
        parts.push(`${names} leads this year in the chart library, with ${weeks} ${weekWord} at No. 1.`)
      } else {
        parts.push(`${names} share the longest run, ${weeks} ${weekWord} at No. 1.`)
      }
    }
  }

  const topCount = facts.topArtists[0]?.hitCount ?? 0
  if (topCount >= 2) {
    const leaders = facts.topArtists.filter((artist) => artist.hitCount === topCount).slice(0, 3)
    const names = joinNames(leaders.map((artist) => artist.artist))
    const hitWord = topCount === 1 ? "1 No. 1" : `${topCount} No. 1s`
    if (leaders.length === 1) {
      parts.push(`${names} had the most No. 1s, with ${hitWord}.`)
    } else {
      parts.push(`${names} each had ${hitWord}.`)
    }
  }

  return parts.join(" ")
}

export function deriveYearStory(year: number, hits: ChartHit[], editorial: string | null = null): YearStory {
  const facts = collectYearFacts(year, hits)
  const note = editorial?.trim() ? editorial.trim() : null
  return {
    year,
    decade: decadeOf(year),
    facts,
    summary: describeYear(facts),
    editorial: note,
  }
}
