import { mapPool } from "@/lib/providers/batch"
import { chooseCatalogMatch } from "@/lib/playlist/match"
import type { CatalogCandidate, MatchedTrack, MatchTrack, UnmatchedTrack } from "@/lib/playlist/types"

export interface CatalogLookup {
  matches: MatchedTrack[]
  unmatched: UnmatchedTrack[]
  unauthorized: boolean
}

export async function matchHits(
  hits: MatchTrack[],
  search: (hit: MatchTrack) => Promise<CatalogCandidate[]>,
  options?: { concurrency?: number; trustStoredId?: boolean },
): Promise<CatalogLookup> {
  let unauthorized = false
  const rows = await mapPool(hits, options?.concurrency ?? 4, async (hit) => {
    if (unauthorized) {
      return { hit, candidate: null as CatalogCandidate | null, failed: true }
    }
    try {
      const candidates = await search(hit)
      const stored =
        options?.trustStoredId && hit.spotifyTrackId
          ? candidates.find((candidate) => candidate.id === hit.spotifyTrackId) ?? null
          : null
      const candidate = stored ?? chooseCatalogMatch(hit, candidates)
      return { hit, candidate, failed: false }
    } catch (error) {
      if (error instanceof Error && error.message === "spotify_unauthorized") {
        unauthorized = true
      }
      return { hit, candidate: null as CatalogCandidate | null, failed: true }
    }
  })

  const matches: MatchedTrack[] = []
  const unmatched: UnmatchedTrack[] = []
  for (const row of rows) {
    if (row.candidate) {
      matches.push({
        key: row.hit.key,
        title: row.hit.title,
        artist: row.hit.artist,
        catalogId: row.candidate.id,
        artworkUrl: row.candidate.artworkUrl,
        url: row.candidate.url,
      })
    } else {
      unmatched.push({
        key: row.hit.key,
        title: row.hit.title,
        artist: row.hit.artist,
        reason: row.failed ? "search_failed" : "not_in_catalog",
      })
    }
  }

  return { matches, unmatched, unauthorized }
}
