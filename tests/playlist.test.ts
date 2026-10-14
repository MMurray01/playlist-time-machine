import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { contrastRatio } from "@/lib/playlist/contrast"
import { decadeOf } from "@/lib/playlist/decade"
import { isMissingColumnError } from "@/lib/playlist/errors"
import { playlistCsv, playlistText } from "@/lib/playlist/export"
import { buildPlaylist, compareChartOrder, dedupeHits, filterByGenres, mapHitRow, orderHits } from "@/lib/playlist/hits"
import { createShareId, isShareId } from "@/lib/playlist/ids"
import { artistMatches, chooseCatalogMatch, searchQueries } from "@/lib/playlist/match"
import { deriveYearStory } from "@/lib/playlist/stories"
import { tokens } from "@/lib/playlist/tokens"
import type { CatalogCandidate, ChartHit } from "@/lib/playlist/types"
import {
  cleanPlaylistTitle,
  emptyChartMessage,
  graduationWindow,
  graduationYearLimits,
  graduationYearMessage,
  isValidGraduationYear,
  MIN_GRADUATION_YEAR,
} from "@/lib/playlist/window"

function hit(overrides: Partial<ChartHit> & Pick<ChartHit, "title" | "artist" | "year">): ChartHit {
  return {
    songId: overrides.songId ?? null,
    year: overrides.year,
    weekNumber: overrides.weekNumber ?? null,
    chartDate: overrides.chartDate ?? null,
    title: overrides.title,
    artist: overrides.artist,
    genre: overrides.genre ?? "Pop",
    appleSongId: overrides.appleSongId ?? null,
    weeksAtNumberOne: overrides.weeksAtNumberOne ?? null,
  }
}

describe("graduation window", () => {
  it("uses five years before through five years after", () => {
    expect(graduationWindow(1984)).toEqual({ startYear: 1979, endYear: 1989 })
    expect(graduationWindow(1984).endYear - graduationWindow(1984).startYear + 1).toBe(11)
  })

  it("rejects years outside the picker and fractional years", () => {
    const limits = graduationYearLimits({
      now: new Date("2026-10-14T12:00:00Z"),
      chartMinYear: 1960,
      chartMaxYear: 2025,
    })
    expect(limits).toEqual({ min: MIN_GRADUATION_YEAR, max: 2026 })
    expect(isValidGraduationYear(1984, limits)).toBe(true)
    expect(isValidGraduationYear(2026, limits)).toBe(true)
    expect(isValidGraduationYear(2027, limits)).toBe(false)
    expect(isValidGraduationYear(1954, limits)).toBe(false)
    expect(graduationYearLimits({ now: new Date("2026-10-14T12:00:00Z"), chartMaxYear: 2010 }).max).toBe(2015)
    expect(graduationYearMessage(2027, limits, 2026)).toMatch(/hasn’t happened yet/)
    expect(graduationYearMessage(2016, graduationYearLimits({ now: new Date("2026-10-14T12:00:00Z"), chartMaxYear: 2010 }), 2026)).toMatch(
      /doesn’t cover/,
    )
    expect(emptyChartMessage(1990)).toMatch(/no No\. 1s/)
    expect(() => graduationWindow(1984.5)).toThrow(/whole number/)
  })

  it("keeps a reunion title and falls back when the name is blank", () => {
    expect(cleanPlaylistTitle("  Class of 1984 reunion  ", 1984)).toBe("Class of 1984 reunion")
    expect(cleanPlaylistTitle("   ", 1984)).toBe("Class of 1984")
    expect(cleanPlaylistTitle("x".repeat(120), 1984)).toHaveLength(80)
  })
})

describe("chart order and genre filter", () => {
  const songs = [
    hit({
      songId: 94,
      title: "I Will Survive",
      artist: "Gloria Gaynor",
      year: 1979,
      chartDate: "1979-03-03",
      weekNumber: 9,
      genre: "Dance",
    }),
    hit({
      songId: 92,
      title: "Le Freak",
      artist: "Chic",
      year: 1979,
      chartDate: "1978-12-09",
      weekNumber: 49,
      genre: "Dance",
    }),
    hit({
      songId: 91,
      title: "Too Much Heaven",
      artist: "Bee Gees",
      year: 1979,
      chartDate: "1979-02-18",
      weekNumber: 7,
      genre: "Pop",
    }),
    hit({ songId: 1, title: "Too Early", artist: "Nobody", year: 1978, chartDate: "1978-01-01", genre: "Pop" }),
    hit({ songId: 2, title: "Too Late", artist: "Nobody", year: 1990, chartDate: "1990-01-01", genre: "Pop" }),
  ]

  it("sorts by chart date, then week, then song id", () => {
    expect(orderHits(songs).map((song) => song.title)).toEqual([
      "Too Early",
      "Le Freak",
      "Too Much Heaven",
      "I Will Survive",
      "Too Late",
    ])
  })

  it("drops songs outside the graduation window and keeps chart order", () => {
    const playlist = buildPlaylist({ graduationYear: 1984, genres: [], hits: songs })
    expect(playlist.hits.map((song) => song.title)).toEqual(["Le Freak", "Too Much Heaven", "I Will Survive"])
    expect(playlist.years.map((year) => year.year)).toEqual([1979])
  })

  it("returns every genre when none are selected and filters without changing order", () => {
    expect(filterByGenres(songs, []).map((song) => song.title)).toEqual(songs.map((song) => song.title))
    const dance = buildPlaylist({ graduationYear: 1984, genres: ["dance"], hits: songs })
    expect(dance.hits.map((song) => song.title)).toEqual(["Le Freak", "I Will Survive"])
  })

  it("keeps the earliest copy of a repeated song", () => {
    const repeated = [
      hit({ songId: 92, title: "Le Freak", artist: "Chic", year: 1979, chartDate: "1979-01-20", weekNumber: 3 }),
      hit({ songId: 92, title: "Le Freak", artist: "Chic", year: 1979, chartDate: "1978-12-09", weekNumber: 49 }),
    ]
    expect(dedupeHits(repeated)).toHaveLength(1)
    expect(dedupeHits(repeated)[0]?.chartDate).toBe("1978-12-09")
  })

  it("reads numeric strings from chart rows", () => {
    const mapped = mapHitRow({
      song_id: "92",
      year: 1979,
      week_number: "49",
      chart_date: "1978-12-09",
      title: "Le Freak",
      artist_name: "Chic",
      genre: "Dance",
      spotify_track_id: null,
      weeks_at_position: "6",
    })
    expect(mapped).toMatchObject({
      songId: 92,
      weekNumber: 49,
      weeksAtNumberOne: 6,
      artist: "Chic",
      appleSongId: null,
      isrc: null,
    })
  })

  it("keeps an Apple song id when the row has one", () => {
    const mapped = mapHitRow({
      song_id: 92,
      year: 1979,
      title: "Le Freak",
      artist_name: "Chic",
      apple_song_id: "1234567890",
      isrc: "usrc17607839",
    })
    expect(mapped?.appleSongId).toBe("1234567890")
    expect(mapped?.isrc).toBe("USRC17607839")
    const ignored = mapHitRow({
      song_id: 92,
      year: 1979,
      title: "Le Freak",
      artist_name: "Chic",
      apple_song_id: "not-an-id",
    })
    expect(ignored?.appleSongId).toBeNull()
  })
})

describe("year stories", () => {
  const hits = [
    hit({ title: "A", artist: "One", year: 1981, weeksAtNumberOne: 2, chartDate: "1981-01-01" }),
    hit({ title: "B", artist: "One", year: 1981, weeksAtNumberOne: 4, chartDate: "1981-02-01" }),
    hit({ title: "C", artist: "Two", year: 1981, weeksAtNumberOne: 4, chartDate: "1981-03-01" }),
  ]

  it("describes counts, the longest run, and the top artist from the rows only", () => {
    const story = deriveYearStory(1981, hits)
    expect(story.editorial).toBeNull()
    expect(story.facts.hitCount).toBe(3)
    expect(story.facts.longestRuns.map((run) => run.title)).toEqual(["B", "C"])
    expect(story.summary).toContain("B by One and C by Two each hold No. 1 for 4 weeks")
    expect(story.summary).toContain("the longest runs of the year")
    expect(story.summary).toContain("The year opens with A by One.")
    expect(story.summary).toContain("One has 2 No. 1s.")
  })

  it("keeps a later editorial note separate from the derived summary", () => {
    const story = deriveYearStory(1981, hits, "A note written later.")
    expect(story.editorial).toBe("A note written later.")
    expect(story.summary).not.toContain("A note written later.")
  })

  it("says when a year has no No. 1s", () => {
    expect(deriveYearStory(1980, []).summary).toBe("1980 has no No. 1 hits in the chart library.")
  })

  it("names the longest corrected run, not a shorter one", () => {
    const story = deriveYearStory(1983, [
      hit({
        title: "Every Breath You Take",
        artist: "The Police",
        year: 1983,
        weeksAtNumberOne: 8,
        chartDate: "1983-07-09",
      }),
      hit({
        title: "Tell Her About It",
        artist: "Billy Joel",
        year: 1983,
        weeksAtNumberOne: 1,
        chartDate: "1983-09-24",
      }),
    ])
    expect(story.summary).toContain("Every Breath You Take by The Police holds No. 1 for 8 weeks")
    expect(story.summary).not.toContain("Tell Her About It holds")
  })
})

describe("class of 1984 chart library", () => {
  const rows = JSON.parse(
    readFileSync(path.join(process.cwd(), "tests/fixtures/class-of-1984.json"), "utf8"),
  ) as Record<string, unknown>[]
  const hits = rows.map((row) => mapHitRow(row)).filter((row): row is ChartHit => row != null)

  it("hides years that have no songs", () => {
    const playlist = buildPlaylist({
      graduationYear: 1984,
      genres: [],
      hits: [hit({ title: "Call Me", artist: "Blondie", year: 1980, chartDate: "1980-04-19" })],
    })
    expect(playlist.years.map((year) => year.year)).toEqual([1980])
    expect(playlist.hits).toHaveLength(1)
  })

  it("builds the known 217-song playlist in chart order", () => {
    const playlist = buildPlaylist({ graduationYear: 1984, genres: [], hits: [...hits].reverse() })
    expect(playlist.hits).toHaveLength(217)
    expect(playlist.hits.slice(0, 3).map((song) => [song.title, song.artist])).toEqual([
      ["Le Freak", "Chic"],
      ["Too Much Heaven", "Bee Gees"],
      ["I Will Survive", "Gloria Gaynor"],
    ])
    expect(playlist.years.map((year) => year.year)).toEqual([
      1979, 1980, 1981, 1982, 1983, 1984, 1985, 1986, 1987, 1988, 1989,
    ])
    const story = playlist.years[0]?.story
    expect(story?.facts.hitCount).toBe(24)
    expect(playlist.years.reduce((sum, year) => sum + year.hits.length, 0)).toBe(217)
    for (const year of playlist.years) {
      for (let index = 1; index < year.hits.length; index += 1) {
        expect(compareChartOrder(year.hits[index - 1], year.hits[index])).toBeLessThanOrEqual(0)
      }
    }
    const countedByChartDate = playlist.hits.filter((song) => {
      const chartYear = Number(song.chartDate?.slice(0, 4))
      return chartYear >= 1979 && chartYear <= 1989
    })
    expect(playlist.hits.filter((song) => song.title === "Le Freak")).toHaveLength(1)
    expect(countedByChartDate).toHaveLength(216)
    const csv = playlistCsv(playlist.hits)
    expect(csv.split("\n").filter(Boolean)).toHaveLength(218)
    expect(csv.startsWith("Artist,Song,Year\n")).toBe(true)
    expect(csv).toContain('"Chic","Le Freak",1979')
    expect(csv.toLowerCase()).not.toContain("spotify")
    expect(playlistText(playlist).match(/Le Freak/g)).toHaveLength(1)
    expect((playlistText(playlist).match(/^\S.*\(\d{4}\)$/gm) ?? []).length).toBe(0)
    expect(story?.facts.longestRuns[0]).toEqual({ title: "Rise", artist: "Herb Alpert", weeks: 7 })
    expect(story?.summary).toContain("Rise by Herb Alpert holds No. 1 for 7 weeks")
    expect(story?.summary).toContain("the longest run of the year")
    expect(story?.summary).toContain("The year opens with Le Freak by Chic.")
    expect(story?.editorial).toBeNull()
  })

  it("filters the real rows by genre without caring about letter case", () => {
    const danceRows = hits.filter((song) => song.genre === "Dance")
    const dance = buildPlaylist({ graduationYear: 1984, genres: ["dance"], hits })
    expect(dance.hits).toHaveLength(danceRows.length)
    expect(dance.hits.every((song) => song.genre.toLowerCase() === "dance")).toBe(true)
    expect(dance.hits.length).toBeGreaterThan(0)
    expect(dance.hits.length).toBeLessThan(hits.length)
  })
})

describe("catalog matching", () => {
  const candidates: CatalogCandidate[] = [
    {
      id: "original",
      title: "I Will Survive",
      artist: "Gloria Gaynor",
      artworkUrl: "https://example.test/art.jpg",
      url: null,
    },
    {
      id: "remix",
      title: "I Will Survive (Remix)",
      artist: "Gloria Gaynor",
      artworkUrl: null,
      url: null,
    },
    {
      id: "other",
      title: "I Will Survive",
      artist: "Someone Else",
      artworkUrl: null,
      url: null,
    },
  ]

  it("prefers the original recording over a remix or the wrong artist", () => {
    expect(chooseCatalogMatch({ title: "I Will Survive", artist: "Gloria Gaynor" }, candidates)?.id).toBe("original")
  })

  it("does not match a remix when that is the only copy", () => {
    expect(chooseCatalogMatch({ title: "I Will Survive", artist: "Gloria Gaynor" }, [candidates[1]])).toBeNull()
  })

  it("ignores punctuation and still requires the artist", () => {
    expect(chooseCatalogMatch({ title: "Da Ya Think I'm Sexy?", artist: "Rod Stewart" }, [
      { id: "sexy", title: "Da Ya Think I'm Sexy", artist: "Rod Stewart", artworkUrl: null, url: null },
    ])?.id).toBe("sexy")
    expect(artistMatches("M", "Michael Jackson")).toBe(false)
    expect(artistMatches("M", "M")).toBe(true)
    expect(artistMatches("Donna Summer and Barbra Streisand", "Donna Summer")).toBe(true)
    expect(artistMatches("The Police", "Police")).toBe(true)
  })

  it("accepts a part number, a medley, and a featured credit the chart line left off", () => {
    expect(
      chooseCatalogMatch({ title: "Another Brick in the Wall", artist: "Pink Floyd" }, [
        {
          id: "wall",
          title: "Another Brick In the Wall, Pt. 2",
          artist: "Pink Floyd",
          artworkUrl: "https://example.test/wall.jpg",
          previewUrl: "https://example.test/wall.m4a",
          url: null,
        },
      ])?.id,
    ).toBe("wall")
    expect(
      chooseCatalogMatch({ title: "Stars on 45 Medley", artist: "Stars on 45" }, [
        {
          id: "stars",
          title: "Stars On 45 (Original Single Version)",
          artist: "Stars On 45",
          artworkUrl: "https://example.test/stars.jpg",
          previewUrl: "https://example.test/stars.m4a",
          url: null,
        },
      ])?.id,
    ).toBe("stars")
    expect(
      chooseCatalogMatch({ title: "Stars on 45 Medley", artist: "Stars on 45" }, [
        {
          id: "inch",
          title: "Stars on 45 Original 7-Inch Single Version",
          artist: "Stars on 45",
          artworkUrl: "https://example.test/inch.jpg",
          previewUrl: "https://example.test/inch.m4a",
          url: null,
        },
      ])?.id,
    ).toBe("inch")
    expect(
      chooseCatalogMatch({ title: "Hello", artist: "Lionel Richie" }, [
        { id: "goodbye", title: "Hello Goodbye", artist: "Lionel Richie", artworkUrl: null, url: null },
      ]),
    ).toBeNull()
    expect(
      chooseCatalogMatch({ title: "Hello", artist: "Lionel Richie" }, [
        { id: "adele", title: "Hello", artist: "Adele", artworkUrl: "https://example.test/a.jpg", previewUrl: "https://example.test/a.m4a", url: null },
      ]),
    ).toBeNull()
    expect(
      chooseCatalogMatch({ title: "Careless Whisper", artist: "Wham!" }, [
        {
          id: "george",
          title: "Careless Whisper",
          artist: "George Michael",
          artworkUrl: "https://example.test/cw.jpg",
          previewUrl: "https://example.test/cw.m4a",
          url: null,
        },
        { id: "seether", title: "Careless Whisper", artist: "Seether", artworkUrl: "https://example.test/s.jpg", previewUrl: "https://example.test/s.m4a", url: null },
      ])?.id,
    ).toBe("george")
    expect(
      chooseCatalogMatch({ title: "Wishing Well", artist: "Terence Trent D'Arby" }, [
        { id: "other", title: "Sign Your Name", artist: "Sananda Maitreya", artworkUrl: null, url: null },
        {
          id: "well",
          title: "Wishing Well",
          artist: "Sananda Maitreya",
          artworkUrl: "https://example.test/w.jpg",
          previewUrl: "https://example.test/w.m4a",
          url: null,
        },
      ])?.id,
    ).toBe("well")
    expect(
      chooseCatalogMatch({ title: "Another Brick in the Wall, Pt. 2", artist: "Pink Floyd" }, [
        { id: "part-1", title: "Another Brick in the Wall, Pt. 1", artist: "Pink Floyd", artworkUrl: null, url: null },
      ]),
    ).toBeNull()
  })

  it("prefers the catalog row that has a cover and a preview", () => {
    expect(
      chooseCatalogMatch({ title: "Le Freak", artist: "Chic" }, [
        { id: "bare", title: "Le Freak", artist: "Chic", artworkUrl: null, previewUrl: null, url: null },
        {
          id: "full",
          title: "Le Freak",
          artist: "Chic",
          artworkUrl: "https://example.test/freak.jpg",
          previewUrl: "https://example.test/freak.m4a",
          url: null,
        },
      ])?.id,
    ).toBe("full")
  })

  it("searches the full credit, then the main artist, then the title", () => {
    expect(searchQueries({ title: "Escape (The Pina Colada Song)", artist: "Rupert Holmes" })).toEqual([
      "Escape (The Pina Colada Song) Rupert Holmes",
      "Escape Rupert Holmes",
      "Escape",
    ])
    expect(searchQueries({ title: "Le Freak", artist: "Chic" })).toEqual(["Le Freak Chic", "Le Freak"])
    expect(searchQueries({ title: "Every Breath You Take", artist: "The Police" })).toEqual([
      "Every Breath You Take The Police",
      "Every Breath You Take Police",
      "Every Breath You Take",
    ])
  })
})

describe("share ids and missing columns", () => {
  it("creates ids the public page can read", () => {
    const id = createShareId(() => 7)
    expect(isShareId(id)).toBe(true)
    expect(id).toHaveLength(10)
    expect(isShareId("../etc")).toBe(false)
  })

  it("detects a missing title column without treating every error as that", () => {
    expect(
      isMissingColumnError(
        { code: "PGRST204", message: "Could not find the 'title' column of 'shared_playlists' in the schema cache" },
        "title",
      ),
    ).toBe(true)
    expect(isMissingColumnError({ code: "42703", message: "column genres does not exist" }, "title")).toBe(false)
  })
})

describe("contrast", () => {
  it("keeps text colors at WCAG AA", () => {
    expect(contrastRatio(tokens.onAccent, tokens.accent)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(tokens.onInk, tokens.ink)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(tokens.ink, tokens.paper)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(tokens.ink, tokens.surface)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(tokens.inkSoft, tokens.paper)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(tokens.inkSoft, tokens.surface)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(tokens.accent, tokens.paper)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(tokens.accent, tokens.surface)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(tokens.dangerInk, tokens.dangerWash)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(tokens.coverInk, tokens.cover)).toBeGreaterThanOrEqual(4.5)
    expect(decadeOf(1984)).toBe(1980)
  })
})
