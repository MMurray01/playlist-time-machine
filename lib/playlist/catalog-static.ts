import { itunesArtworkUrl } from "@/lib/providers/itunes"
import type { MatchedTrack, MatchTrack, UnmatchedTrack } from "@/lib/playlist/types"

/** A precomputed Apple/iTunes match. Null means the song was checked and has no catalog row. */
export interface CatalogMatchRecord {
  catalogId: string
  artworkUrl: string | null
  previewUrl: string | null
  url: string | null
}

export interface StaticCatalogFile {
  version: 1
  generatedAt: string
  songs: Record<string, CatalogMatchRecord | null>
}

export function catalogSongId(key: string): string | null {
  const match = /^song:(\d+)$/.exec(key)
  return match?.[1] ?? null
}

export function partitionStaticTracks(
  tracks: readonly MatchTrack[],
  songs: Record<string, CatalogMatchRecord | null>,
): { matches: MatchedTrack[]; unmatched: UnmatchedTrack[]; unknown: MatchTrack[] } {
  const matches: MatchedTrack[] = []
  const unmatched: UnmatchedTrack[] = []
  const unknown: MatchTrack[] = []

  for (const track of tracks) {
    const songId = catalogSongId(track.key)
    if (!songId || !Object.prototype.hasOwnProperty.call(songs, songId)) {
      unknown.push(track)
      continue
    }
    const row = songs[songId]
    if (!row?.catalogId) {
      unmatched.push({
        key: track.key,
        title: track.title,
        artist: track.artist,
        reason: "not_in_catalog",
      })
      continue
    }
    const artworkUrl = itunesArtworkUrl(row.artworkUrl ?? undefined, 240) ?? row.artworkUrl
    matches.push({
      key: track.key,
      title: track.title,
      artist: track.artist,
      catalogId: row.catalogId,
      artworkUrl,
      artworkLargeUrl: itunesArtworkUrl(row.artworkUrl ?? undefined, 800) ?? artworkUrl,
      previewUrl: row.previewUrl,
      url: row.url,
    })
  }

  return { matches, unmatched, unknown }
}
