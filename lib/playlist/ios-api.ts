import { withAppleAffiliate } from "@/lib/affiliate"
import {
  APPLE_COVER_TIP,
  appleLibraryPlaylistDescription,
  appleLibraryPlaylistName,
} from "@/lib/playlist/apple-library"
import { collageArtworkUrl, planCollage, type CollagePlan } from "@/lib/playlist/collage"
import { hitKey } from "@/lib/playlist/hits"
import { isShareId } from "@/lib/playlist/ids"
import { canonicalShareUrl, shareMessage, shareSubject, withShareUtm } from "@/lib/share/channels"
import { recipientPrompt, recipientQuestion } from "@/lib/share/recipient"
import type { BuiltPlaylist, ChartHit, MatchedTrack, UnmatchedTrack, YearStory } from "@/lib/playlist/types"
import { cleanPlaylistTitle } from "@/lib/playlist/window"

/** Bundle id registered for the Abeba Co Apple Developer account. */
export const IOS_BUNDLE_ID = "com.abeba.playlisttimemachine"

/** Team ID from developer.apple.com → Membership Details. */
export const APPLE_TEAM_ID = "WS2R3SYV4W"

export const ITUNES_PREVIEW_ATTRIBUTION = "Song previews provided courtesy of iTunes."

export const API_VERSION = 1

const GENRE_TEXT = /^[\p{L}\p{N}][\p{L}\p{N}&/+' ._()-]{0,39}$/u

const BLOCKED_TITLE_WORDS = [
  "fuck",
  "shit",
  "bitch",
  "asshole",
  "cunt",
  "nigger",
  "nigga",
  "faggot",
  "retard",
]

export function appleAppID(teamID = APPLE_TEAM_ID): string {
  return `${teamID}.${IOS_BUNDLE_ID}`
}

/** Association file for /p/* universal links on www and the apex host. */
export function appleAppSiteAssociation(teamID = APPLE_TEAM_ID) {
  return {
    applinks: {
      details: [
        {
          appIDs: [appleAppID(teamID)],
          components: [
            {
              "/": "/p/*/opengraph-image",
              exclude: true,
              comment: "Generated link images stay on the website.",
            },
            {
              "/": "/p/*",
              comment: "Shared playlist links open in Playlist Time Machine.",
            },
          ],
        },
      ],
    },
  }
}

export function abusivePlaylistTitle(title: string): boolean {
  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean)
  return BLOCKED_TITLE_WORDS.some((word) => words.includes(word))
}

export type PlaylistQuery =
  | { kind: "limits" }
  | { kind: "year"; year: number; genres: string[] }
  | { kind: "share"; id: string }
  | { kind: "error"; status: number; error: string }

function parseGenreList(parts: string[]): { ok: true; genres: string[] } | { ok: false; error: string } {
  if (parts.length > 12) return { ok: false, error: "Choose fewer genres." }
  const genres: string[] = []
  for (const part of parts) {
    const genre = part.trim()
    if (!genre) continue
    if (!GENRE_TEXT.test(genre)) return { ok: false, error: "Those genres could not be used." }
    genres.push(genre)
  }
  return { ok: true, genres }
}

export function parsePlaylistQuery(params: URLSearchParams): PlaylistQuery {
  const id = params.get("id")
  if (id != null && id !== "") {
    if (!isShareId(id)) return { kind: "error", status: 404, error: "This playlist link is not here." }
    return { kind: "share", id }
  }

  const yearRaw = params.get("year")
  if (yearRaw == null || yearRaw.trim() === "") return { kind: "limits" }
  if (!/^\d{4}$/.test(yearRaw)) {
    return { kind: "error", status: 400, error: "Enter the year you graduated high school." }
  }

  const genresRaw = params.get("genres")
  const parsed = parseGenreList(genresRaw == null || genresRaw.trim() === "" ? [] : genresRaw.split(","))
  if (!parsed.ok) return { kind: "error", status: 400, error: parsed.error }
  return { kind: "year", year: Number(yearRaw), genres: parsed.genres }
}

export function parseShareBody(
  body: unknown,
): { ok: true; graduationYear: number; title: string; genres: string[] } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "The share request was empty." }
  const record = body as Record<string, unknown>
  const year = record.graduationYear
  if (typeof year !== "number" || !Number.isInteger(year)) {
    return { ok: false, error: "Enter the year you graduated high school." }
  }
  const title = typeof record.title === "string" ? record.title : ""
  if (title.length > 120) return { ok: false, error: "That playlist name is too long." }

  let genres: string[] = []
  if (record.genres != null) {
    if (!Array.isArray(record.genres) || record.genres.some((genre) => typeof genre !== "string")) {
      return { ok: false, error: "Those genres could not be used." }
    }
    const parsed = parseGenreList(record.genres.filter((genre): genre is string => typeof genre === "string"))
    if (!parsed.ok) return parsed
    genres = parsed.genres
  }

  const cleaned = cleanPlaylistTitle(title, year)
  if (title.trim() && abusivePlaylistTitle(cleaned)) {
    return { ok: false, error: "Choose a playlist name without abusive language." }
  }
  return { ok: true, graduationYear: year, title: cleaned, genres }
}

export function shareErrorStatus(error: string): number {
  if (error.startsWith("Too many share links")) return 429
  if (error.includes("server database key")) return 503
  if (error.includes("could not be saved")) return 500
  return 400
}

export function shareFailureHeaders(
  status: number,
  retryAfterSeconds?: number,
): Record<string, string> | undefined {
  if (status !== 429) return undefined
  const seconds = Math.max(1, Math.ceil(retryAfterSeconds ?? 60 * 60))
  return {
    "Retry-After": String(seconds),
    "Cache-Control": "no-store",
  }
}

export interface PlaylistShareCopy {
  id: string
  url: string
  shareUrl: string
  message: string
  subject: string
}

export function playlistShareCopy(id: string, pageUrl: string, graduationYear: number): PlaylistShareCopy {
  const url = canonicalShareUrl(pageUrl)
  const shareUrl = withShareUtm(url, "native")
  return {
    id,
    url,
    shareUrl,
    message: shareMessage("playlist", shareUrl, graduationYear),
    subject: shareSubject("playlist", graduationYear),
  }
}

export interface ApiCatalog {
  catalogId: string
  artworkUrl: string | null
  artworkLargeUrl: string | null
  previewUrl: string | null
  url: string | null
}

export interface ApiHit {
  key: string
  songId: number | null
  year: number
  weekNumber: number | null
  chartDate: string | null
  title: string
  artist: string
  genre: string
  weeksAtNumberOne: number | null
  catalog: ApiCatalog | null
  matchReason: "not_in_catalog" | "search_failed" | null
  appleMusicUrl: string
}

export interface ApiYear {
  year: number
  story: YearStory
  hits: ApiHit[]
}

export interface PlaylistArtworkCover {
  key: string
  title: string
  artworkUrl: string | null
}

export interface PlaylistArtwork {
  presentsAs: "playlist-artwork"
  playlistTitle: string
  headline: string
  mark: string
  link: string | null
  plan: CollagePlan
  covers: PlaylistArtworkCover[]
}

export interface PlaylistLibraryCopy {
  name: string
  description: string
  coverTip: string
}

export interface PlaylistPayload {
  ok: true
  version: 1
  courtesy: string
  limits: { min: number; max: number }
  limitsError: string | null
  availableGenres: string[]
  playlist: {
    graduationYear: number
    startYear: number
    endYear: number
    genres: string[]
    title: string
    hits: ApiHit[]
    years: ApiYear[]
  }
  artwork: PlaylistArtwork | null
  library: PlaylistLibraryCopy
  share: PlaylistShareCopy | null
  recipient: { prompt: string; question: string } | null
  filterMessage: string | null
}

export function availableGenres(hits: readonly ChartHit[]): string[] {
  const seen = new Map<string, string>()
  for (const hit of hits) {
    const genre = hit.genre.trim()
    if (!genre) continue
    const key = genre.toLowerCase()
    if (!seen.has(key)) seen.set(key, genre)
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b))
}

export function appleMusicLink(
  hit: Pick<ChartHit, "title" | "artist">,
  catalogUrl: string | null | undefined,
  affiliateToken?: string | null,
): string {
  const destination =
    catalogUrl || `https://music.apple.com/us/search?term=${encodeURIComponent(`${hit.title} ${hit.artist}`)}`
  return withAppleAffiliate(destination, "preview-badge", affiliateToken)
}

function toApiHit(
  hit: ChartHit,
  matches: ReadonlyMap<string, MatchedTrack>,
  unmatched: ReadonlyMap<string, UnmatchedTrack>,
  affiliateToken?: string | null,
): ApiHit {
  const key = hitKey(hit)
  const match = matches.get(key)
  const miss = unmatched.get(key)
  const catalog: ApiCatalog | null = match
    ? {
        catalogId: match.catalogId,
        artworkUrl: match.artworkUrl,
        artworkLargeUrl: match.artworkLargeUrl ?? null,
        previewUrl: match.previewUrl ?? null,
        url: match.url,
      }
    : null
  return {
    key,
    songId: hit.songId,
    year: hit.year,
    weekNumber: hit.weekNumber,
    chartDate: hit.chartDate,
    title: hit.title,
    artist: hit.artist,
    genre: hit.genre,
    weeksAtNumberOne: hit.weeksAtNumberOne,
    catalog,
    matchReason: match ? null : miss?.reason ?? null,
    appleMusicUrl: appleMusicLink(hit, match?.url, affiliateToken),
  }
}

export function playlistArtwork(
  playlist: BuiltPlaylist,
  matches: ReadonlyMap<string, MatchedTrack>,
  link: string | null,
): PlaylistArtwork | null {
  if (playlist.hits.length === 0) return null
  try {
    const planned = planCollage({
      format: "square",
      layout: "mosaic",
      title: playlist.title,
      startYear: playlist.startYear,
      endYear: playlist.endYear,
      hits: playlist.hits.map((hit) => ({
        key: hitKey(hit),
        year: hit.year,
        weeks: hit.weeksAtNumberOne != null && hit.weeksAtNumberOne > 0 ? hit.weeksAtNumberOne : 0,
      })),
    })
    const plan = { ...planned, mark: "Playlist Time Machine" }
    return {
      presentsAs: "playlist-artwork",
      playlistTitle: playlist.title,
      headline: plan.headline,
      mark: plan.mark,
      link,
      plan,
      covers: playlist.hits.map((hit) => {
        const key = hitKey(hit)
        const match = matches.get(key)
        return {
          key,
          title: hit.title,
          artworkUrl: collageArtworkUrl(match?.artworkLargeUrl || match?.artworkUrl || null),
        }
      }),
    }
  } catch {
    return null
  }
}

export function buildPlaylistPayload(input: {
  visible: BuiltPlaylist
  artworkSource: BuiltPlaylist
  matches: readonly MatchedTrack[]
  unmatched: readonly UnmatchedTrack[]
  limits: { min: number; max: number }
  limitsError: string | null
  share: { id: string; url: string } | null
  recipientYear: number | null
  affiliateToken?: string | null
  filterMessage: string | null
}): PlaylistPayload {
  const matches = new Map(input.matches.map((match) => [match.key, match]))
  const unmatched = new Map(input.unmatched.map((miss) => [miss.key, miss]))
  const share = input.share
    ? playlistShareCopy(input.share.id, input.share.url, input.artworkSource.graduationYear)
    : null
  const mapHit = (hit: ChartHit) => toApiHit(hit, matches, unmatched, input.affiliateToken)

  return {
    ok: true,
    version: API_VERSION,
    courtesy: ITUNES_PREVIEW_ATTRIBUTION,
    limits: input.limits,
    limitsError: input.limitsError,
    availableGenres: availableGenres(input.artworkSource.hits),
    playlist: {
      graduationYear: input.visible.graduationYear,
      startYear: input.visible.startYear,
      endYear: input.visible.endYear,
      genres: input.visible.genres,
      title: input.visible.title,
      hits: input.visible.hits.map(mapHit),
      years: input.visible.years.map((chapter) => ({
        year: chapter.year,
        story: chapter.story,
        hits: chapter.hits.map(mapHit),
      })),
    },
    artwork: playlistArtwork(input.artworkSource, matches, share?.url ?? null),
    library: {
      name: appleLibraryPlaylistName(input.artworkSource.graduationYear),
      description: appleLibraryPlaylistDescription(
        input.artworkSource.startYear,
        input.artworkSource.endYear,
        share?.url,
      ),
      coverTip: APPLE_COVER_TIP,
    },
    share,
    recipient:
      input.recipientYear == null
        ? null
        : { prompt: recipientPrompt(input.recipientYear), question: recipientQuestion() },
    filterMessage: input.filterMessage,
  }
}
