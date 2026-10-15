import { describe, expect, it } from "vitest"
import type { BuiltPlaylist, ChartHit } from "@/lib/playlist/types"
import {
  breadcrumbJsonLd,
  classPlaylistJsonLd,
  homeJsonLd,
  jsonLdMarkup,
  yearListJsonLd,
} from "@/lib/seo/jsonld"
import {
  canonicalUrl,
  chartYearDescription,
  chartYearTitle,
  classImageAlt,
  classIntro,
  classSongDescription,
  classSongTitle,
  classYearForChart,
  classYearsForChart,
  classesCoveringYear,
  decadeStarts,
  decadeTitle,
  parseHitsSlug,
  playlistCtaHref,
  robotsPolicy,
  sitemapEntries,
} from "@/lib/seo/pages"
import { SITE_URL } from "@/lib/site/metadata"

function expectClean(value: string) {
  expect(value).not.toContain("\u2014")
  expect(value).not.toContain("\u2013")
  expect(value.toLowerCase()).not.toContain("billboard")
}

const hit = (title: string, artist: string): ChartHit => ({
  songId: null,
  year: 1984,
  weekNumber: 1,
  chartDate: "1984-01-07",
  title,
  artist,
  genre: "",
  appleSongId: null,
  weeksAtNumberOne: 1,
})

describe("search landing copy", () => {
  it("names a class page the way the title tag should read", () => {
    const title = classSongTitle(1985, 1980, 1990)
    expect(title).toBe("Class of 1985 songs: the number one hits from 1980 to 1990")
    const description = classSongDescription(1985, 1980, 1990, 255)
    expect(description.startsWith(`${title}.`)).toBe(true)
    expect(description).toContain("255 songs")
    expect(classIntro(1985, 1980, 1990)).toContain("from 1980 to 1990")
    expect(classImageAlt(1985, 1980, 1990)).toBe(
      "Class of 1985 songs, the number one hits from 1980 to 1990.",
    )
    expectClean(title)
    expectClean(description)
    expectClean(classIntro(1985, 1980, 1990))
  })

  it("names a chart year and a decade without a chart brand", () => {
    expect(chartYearTitle(1984)).toBe("Number one hits of 1984")
    expect(chartYearDescription(1984, 1)).toContain("1 song reached")
    expect(decadeTitle(1980)).toBe("Number one hits of the 1980s")
    expectClean(chartYearDescription(1984, 20))
    expectClean(decadeTitle(1980))
  })

  it("sends the class call to action home with a ref the builder recognizes", () => {
    expect(playlistCtaHref(1985, "class-of")).toBe("/?year=1985&ref=class-of")
  })
})

describe("canonical urls", () => {
  it("drops campaign and version parameters and keeps the www origin", () => {
    expect(canonicalUrl("/class-of/1985?utm_source=share&utm_medium=social&v=2")).toBe(
      `${SITE_URL}/class-of/1985`,
    )
    expect(canonicalUrl("https://playlisttimemachine.com/?v=9&utm_campaign=spring#songs")).toBe(SITE_URL)
    expect(canonicalUrl("http://localhost:3000/number-one-hits/1984/?utm_source=x")).toBe(
      `${SITE_URL}/number-one-hits/1984`,
    )
  })
})

describe("sitemap and robots", () => {
  const entries = sitemapEntries({
    classYears: [1985],
    chartYears: [1984],
    decades: [1980],
  })
  const urls = entries.map((entry) => entry.url)

  it("lists public pages, class years, chart years, and decade hubs", () => {
    expect(urls).toContain(SITE_URL)
    expect(urls).toContain(`${SITE_URL}/how-it-works`)
    expect(urls).toContain(`${SITE_URL}/class-of/1985`)
    expect(urls).toContain(`${SITE_URL}/number-one-hits/1984`)
    expect(urls).toContain(`${SITE_URL}/number-one-hits/1980s`)
  })

  it("leaves private and utility routes out", () => {
    expect(urls.join(" ")).not.toContain("/p/")
    expect(urls.join(" ")).not.toContain("/api")
    expect(urls.join(" ")).not.toContain("/playlist-results")
  })

  it("allows the site, hides utility routes, and points at the www sitemap", () => {
    const robots = robotsPolicy()
    expect(robots.sitemap).toBe(`${SITE_URL}/sitemap.xml`)
    expect(robots.host).toBe(SITE_URL)
    expect(robots.rules.allow).toBe("/")
    expect(robots.rules.disallow).toEqual(["/api/", "/playlist-results"])
    expect(robots.rules.disallow).not.toContain("/p/")
  })
})

describe("which years get a page", () => {
  const chartYears = [1958, 1984, 2024]

  it("covers every graduation year whose window can touch the chart", () => {
    const years = classYearsForChart(chartYears, new Date("2026-10-14T00:00:00Z"))
    expect(years[0]).toBe(1955)
    expect(years.at(-1)).toBe(2026)
    expect(years).toContain(1985)
  })

  it("groups chart years into decades and finds the classes that include a year", () => {
    expect(decadeStarts(chartYears)).toEqual([1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020])
    expect(classesCoveringYear(1984, [1979, 1985, 1995])).toEqual([1979, 1985])
    expect(classYearForChart(1984, [1979, 1984, 1985])).toBe(1984)
    expect(parseHitsSlug("1984")).toEqual({ kind: "year", year: 1984 })
    expect(parseHitsSlug("1980s")).toEqual({ kind: "decade", decadeStart: 1980 })
    expect(parseHitsSlug("1984s")).toBeNull()
    expect(parseHitsSlug("nope")).toBeNull()
  })
})

describe("structured data", () => {
  const playlist: BuiltPlaylist = {
    graduationYear: 1985,
    startYear: 1980,
    endYear: 1990,
    genres: [],
    title: "Class of 1985",
    hits: [hit("Jump", "Van Halen")],
    years: [],
  }

  it("describes the site, a class playlist, and the breadcrumb trail", () => {
    const home = homeJsonLd()
    expect(home["@graph"].map((node) => node["@type"])).toEqual(["WebSite", "Organization"])
    expect(home["@graph"][1]?.logo).toBe(`${SITE_URL}/icon.png`)

    const songs = classPlaylistJsonLd(playlist, "/class-of/1985", classSongTitle(1985, 1980, 1990))
    expect(songs["@type"]).toBe("MusicPlaylist")
    expect(songs.name).toBe("Class of 1985 songs: the number one hits from 1980 to 1990")
    expect(songs.numTracks).toBe(1)
    expect(songs.track[0]).toMatchObject({ name: "Jump", byArtist: { name: "Van Halen" } })

    const crumbs = breadcrumbJsonLd([
      { name: "Playlist Time Machine", path: "/" },
      { name: "Class of 1985", path: "/class-of/1985" },
    ])
    expect(crumbs.itemListElement[1]?.item).toBe(`${SITE_URL}/class-of/1985`)

    const year = yearListJsonLd(1984, [hit("Jump", "Van Halen")], "/number-one-hits/1984")
    expect(year.numberOfItems).toBe(1)
    expectClean(JSON.stringify(home))
    expectClean(JSON.stringify(songs))
  })

  it("keeps a less-than sign out of the script body", () => {
    expect(jsonLdMarkup({ name: "A < B" })).toBe('{"name":"A \\u003c B"}')
  })
})
