import { YEAR_EDITORIAL } from "@/lib/playlist/editorial"
import { deriveYearStory } from "@/lib/playlist/stories"
import type { BuiltPlaylist, ChartHit } from "@/lib/playlist/types"
import { defaultPlaylistTitle, graduationWindow } from "@/lib/playlist/window"

export function hitKey(hit: Pick<ChartHit, "songId" | "title" | "artist" | "year">): string {
  return hit.songId != null ? `song:${hit.songId}` : `${hit.year}:${hit.title}:${hit.artist}`
}

const APPLE_SONG_ID = /^[0-9]{2,18}$/

function appleSongIdFrom(row: Record<string, unknown>): string | null {
  for (const key of ["apple_song_id", "apple_music_id"]) {
    const value = row[key]
    if (typeof value === "string" && APPLE_SONG_ID.test(value.trim())) return value.trim()
  }
  return null
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export function mapHitRow(row: Record<string, unknown>): ChartHit | null {
  const title = typeof row.title === "string" ? row.title.trim() : ""
  const artist = typeof row.artist_name === "string" ? row.artist_name.trim() : ""
  const year = asNumber(row.year)
  if (!title || !artist || year == null || !Number.isInteger(year)) return null

  const songId = asNumber(row.song_id)
  const weekNumber = asNumber(row.week_number)
  const weeks = asNumber(row.weeks_at_position)

  return {
    songId: songId == null ? null : songId,
    year,
    weekNumber,
    chartDate: typeof row.chart_date === "string" && row.chart_date ? row.chart_date : null,
    title,
    artist,
    genre: typeof row.genre === "string" ? row.genre.trim() : "",
    appleSongId: appleSongIdFrom(row),
    weeksAtNumberOne: weeks,
  }
}

export function compareChartOrder(a: ChartHit, b: ChartHit): number {
  const dateA = a.chartDate ?? ""
  const dateB = b.chartDate ?? ""
  if (dateA !== dateB) {
    if (!dateA) return 1
    if (!dateB) return -1
    return dateA < dateB ? -1 : 1
  }

  const weekA = a.weekNumber ?? Number.POSITIVE_INFINITY
  const weekB = b.weekNumber ?? Number.POSITIVE_INFINITY
  if (weekA !== weekB) return weekA - weekB

  const idA = a.songId ?? Number.POSITIVE_INFINITY
  const idB = b.songId ?? Number.POSITIVE_INFINITY
  if (idA !== idB) return idA - idB

  return a.title.localeCompare(b.title) || a.artist.localeCompare(b.artist)
}

export function orderHits(hits: ChartHit[]): ChartHit[] {
  return [...hits].sort(compareChartOrder)
}

function duplicateKey(hit: ChartHit): string {
  if (hit.songId != null) return `id:${hit.songId}`
  return `text:${hit.title.trim().toLowerCase()}::${hit.artist.trim().toLowerCase()}`
}

/** Keep the earliest chart appearance of a repeated song. */
export function dedupeHits(hits: ChartHit[]): ChartHit[] {
  const ordered = orderHits(hits)
  const seen = new Set<string>()
  const unique: ChartHit[] = []
  for (const hit of ordered) {
    const key = duplicateKey(hit)
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(hit)
  }
  return unique
}

export function filterByGenres(hits: ChartHit[], genres: string[]): ChartHit[] {
  const selected = genres.map((genre) => genre.trim().toLowerCase()).filter(Boolean)
  if (selected.length === 0) return hits
  const allowed = new Set(selected)
  return hits.filter((hit) => allowed.has(hit.genre.trim().toLowerCase()))
}

export function buildPlaylist(input: {
  graduationYear: number
  genres: string[]
  hits: ChartHit[]
  title?: string
  editorial?: Readonly<Record<number, string>>
}): BuiltPlaylist {
  const window = graduationWindow(input.graduationYear)
  const notes = input.editorial ?? YEAR_EDITORIAL
  const inWindow = dedupeHits(input.hits).filter(
    (hit) => hit.year >= window.startYear && hit.year <= window.endYear,
  )
  const hits = filterByGenres(inWindow, input.genres)
  const years = []

  for (let year = window.startYear; year <= window.endYear; year += 1) {
    const yearHits = orderHits(hits.filter((hit) => hit.year === year))
    years.push({
      year,
      hits: yearHits,
      story: deriveYearStory(year, yearHits, notes[year] ?? null),
    })
  }

  const title = input.title?.trim() ? input.title.trim() : defaultPlaylistTitle(input.graduationYear)

  return {
    graduationYear: input.graduationYear,
    startYear: window.startYear,
    endYear: window.endYear,
    genres: input.genres.map((genre) => genre.trim()).filter(Boolean),
    title,
    hits,
    years,
  }
}
