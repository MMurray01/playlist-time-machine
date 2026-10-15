import { SITE_URL } from "@/lib/site/metadata"
import { graduationWindow, graduationYearLimits } from "@/lib/playlist/window"

export function playlistCtaHref(year: number, ref: "class-of" | "number-one-hits"): string {
  return `/?year=${year}&ref=${ref}`
}

export function classImageAlt(year: number, startYear: number, endYear: number): string {
  return `Class of ${year} songs, the number one hits from ${startYear} to ${endYear}.`
}

export function chartYearImageAlt(year: number): string {
  return `Number one hits of ${year}.`
}

export function decadeImageAlt(decadeStart: number): string {
  return `Number one hits of the ${decadeStart}s.`
}

/** Graduation year used by the "Make my playlist" link for a single chart year. */
export function classYearForChart(chartYear: number, classYears: readonly number[]): number | null {
  if (classYears.includes(chartYear)) return chartYear
  const covering = classesCoveringYear(chartYear, classYears)
  if (covering.length === 0) return null
  return covering[Math.floor(covering.length / 2)] ?? null
}

/** A class year whose graduation falls inside the decade, when one exists. */
export function classYearInDecade(decadeStart: number, classYears: readonly number[]): number | null {
  const matches = classYears.filter((year) => year >= decadeStart && year < decadeStart + 10)
  if (matches.length === 0) return null
  return matches[Math.floor(matches.length / 2)] ?? null
}

export const PUBLIC_PATHS = ["/", "/how-it-works", "/from-spotify", "/privacy", "/terms"] as const

export const ROBOTS_DISALLOW = ["/api/", "/playlist-results"] as const

export function classSongTitle(year: number, startYear: number, endYear: number): string {
  return `Class of ${year} songs: the number one hits from ${startYear} to ${endYear}`
}

export function classSongDescription(year: number, startYear: number, endYear: number, count: number): string {
  const songs = count === 1 ? "1 song" : `${count} songs`
  return `Class of ${year} songs: the number one hits from ${startYear} to ${endYear}. ${songs} that reached number one, listed year by year.`
}

export function classIntro(year: number, startYear: number, endYear: number): string {
  return `The class of ${year} grew up with the number one hits from ${startYear} to ${endYear}. Here they are, year by year, in the order they reached the top.`
}

export function chartYearTitle(year: number): string {
  return `Number one hits of ${year}`
}

export function chartYearDescription(year: number, count: number): string {
  const songs = count === 1 ? "1 song reached" : `${count} songs reached`
  return `Number one hits of ${year}. ${songs} number one in ${year}, in the order they got there.`
}

export function decadeTitle(decadeStart: number): string {
  return `Number one hits of the ${decadeStart}s`
}

export function decadeDescription(decadeStart: number): string {
  return `Number one hits of the ${decadeStart}s. Each chart year in the decade, and the class playlists those songs belong to.`
}

export function canonicalUrl(input: string): string {
  const url = new URL(input, SITE_URL)
  const path = url.pathname === "/" ? "" : url.pathname.replace(/\/+$/, "")
  return `${SITE_URL}${path}`
}

export function classYearsForChart(chartYears: readonly number[], now = new Date()): number[] {
  if (chartYears.length === 0) return []
  const limits = graduationYearLimits({
    now,
    chartMinYear: chartYears[0],
    chartMaxYear: chartYears[chartYears.length - 1],
  })
  const years: number[] = []
  for (let year = limits.min; year <= limits.max; year += 1) years.push(year)
  return years
}

export function decadeStarts(chartYears: readonly number[]): number[] {
  if (chartYears.length === 0) return []
  const first = Math.floor(chartYears[0]! / 10) * 10
  const last = Math.floor(chartYears[chartYears.length - 1]! / 10) * 10
  const starts: number[] = []
  for (let year = first; year <= last; year += 10) starts.push(year)
  return starts
}

export function classesCoveringYear(year: number, classYears: readonly number[]): number[] {
  return classYears.filter((graduationYear) => {
    const window = graduationWindow(graduationYear)
    return year >= window.startYear && year <= window.endYear
  })
}

export type SitemapEntry = {
  url: string
  changeFrequency: "weekly" | "monthly" | "yearly"
  priority: number
}

export function sitemapEntries(input: {
  classYears: readonly number[]
  chartYears: readonly number[]
  decades: readonly number[]
}): SitemapEntry[] {
  const entries: SitemapEntry[] = PUBLIC_PATHS.map((path) => ({
    url: canonicalUrl(path),
    changeFrequency: path === "/" ? "weekly" : "yearly",
    priority: path === "/" ? 1 : 0.4,
  }))
  for (const year of input.classYears) {
    entries.push({
      url: canonicalUrl(`/class-of/${year}`),
      changeFrequency: "monthly",
      priority: 0.8,
    })
  }
  for (const year of input.chartYears) {
    entries.push({
      url: canonicalUrl(`/number-one-hits/${year}`),
      changeFrequency: "monthly",
      priority: 0.6,
    })
  }
  for (const decade of input.decades) {
    entries.push({
      url: canonicalUrl(`/number-one-hits/${decade}s`),
      changeFrequency: "monthly",
      priority: 0.5,
    })
  }
  return entries
}

export function parseHitsSlug(slug: string): { kind: "year"; year: number } | { kind: "decade"; decadeStart: number } | null {
  if (/^\d{4}$/.test(slug)) return { kind: "year", year: Number(slug) }
  const decade = /^(\d{4})s$/.exec(slug)
  if (decade && Number(decade[1]) % 10 === 0) return { kind: "decade", decadeStart: Number(decade[1]) }
  return null
}

/**
 * Crawlers may fetch every public page. Share pages (/p/:id) are omitted from
 * the sitemap and send noindex, so they are not disallowed here.
 */
export function robotsPolicy() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...ROBOTS_DISALLOW],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
