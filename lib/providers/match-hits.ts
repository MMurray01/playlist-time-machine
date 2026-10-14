import { mapPool } from "@/lib/providers/batch"
import { chooseCatalogMatch } from "@/lib/playlist/match"
import type { CatalogCandidate, MatchedTrack, MatchTrack, UnmatchedTrack } from "@/lib/playlist/types"

export interface CatalogLookup {
  matches: MatchedTrack[]
  unmatched: UnmatchedTrack[]
}

export async function matchHits(
  hits: MatchTrack[],
  search: (hit: MatchTrack) => Promise<CatalogCandidate[]>,
  options?: { concurrency?: number },
): Promise<CatalogLookup> {
  const rows = await mapPool(hits, options?.concurrency ?? 4, async (hit) => {
    try {
      const candidates = await search(hit)
      return { hit, candidate: chooseCatalogMatch(hit, candidates), failed: false }
    } catch {
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

  return { matches, unmatched }
}
