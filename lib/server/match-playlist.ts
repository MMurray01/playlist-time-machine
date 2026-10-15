import "server-only"

import catalogFile from "@/data/catalog-matches.json"
import { partitionStaticTracks, type StaticCatalogFile } from "@/lib/playlist/catalog-static"
import { hitKey } from "@/lib/playlist/hits"
import type { ChartHit, MatchedTrack, MatchTrack, UnmatchedTrack } from "@/lib/playlist/types"
import { readAppleMusicCredentials, signAppleDeveloperToken } from "@/lib/providers/apple-token"
import { createCatalogSearcher } from "@/lib/providers/catalog-search"
import { matchHits } from "@/lib/providers/match-hits"
import { catalogCacheKey, readCatalogCache, writeCatalogCache } from "@/lib/server/catalog-cache"

const staticSongs = (catalogFile as StaticCatalogFile).songs

/** Live catalog search is only worth it for a handful of songs the static file missed. */
const LIVE_SEARCH_LIMIT = 20
const LIVE_SEARCH_BUDGET_MS = 8_000

function asTracks(hits: readonly ChartHit[]): MatchTrack[] {
  return hits.map((hit) => ({
    key: hitKey(hit),
    title: hit.title,
    artist: hit.artist,
    appleSongId: hit.appleSongId,
    isrc: hit.isrc ?? null,
  }))
}

function failed(tracks: readonly MatchTrack[]): UnmatchedTrack[] {
  return tracks.map((track) => ({
    key: track.key,
    title: track.title,
    artist: track.artist,
    reason: "search_failed" as const,
  }))
}

/**
 * The same static catalog the website uses, then the same searcher for a few
 * songs that are not in that file. Anything still unresolved is left for
 * MusicKit on the device.
 */
export async function resolveHitCatalog(hits: readonly ChartHit[]): Promise<{
  matches: MatchedTrack[]
  unmatched: UnmatchedTrack[]
}> {
  const known = partitionStaticTracks(asTracks(hits), staticSongs)
  if (known.unknown.length === 0) {
    return { matches: known.matches, unmatched: known.unmatched }
  }
  if (known.unknown.length > LIVE_SEARCH_LIMIT) {
    return { matches: known.matches, unmatched: [...known.unmatched, ...failed(known.unknown)] }
  }

  const credentials = readAppleMusicCredentials()
  let developerToken: string | null = null
  if (credentials) {
    try {
      developerToken = await signAppleDeveloperToken({ ...credentials, expiresIn: "1d" })
    } catch (error) {
      console.error("Apple developer token failed", error instanceof Error ? error.message : "unknown")
    }
  }

  const search = createCatalogSearcher(fetch, { developerToken })
  const lookup = matchHits(known.unknown, async (hit) => {
    const key = catalogCacheKey(hit)
    const cached = readCatalogCache(key)
    if (cached && cached.length > 0) return cached
    const found = await search(hit)
    if (found.length > 0) writeCatalogCache(key, found)
    return found
  })

  const finished = await Promise.race([
    lookup.then((result) => ({ ok: true as const, result })),
    new Promise<{ ok: false }>((resolve) => {
      setTimeout(() => resolve({ ok: false }), LIVE_SEARCH_BUDGET_MS)
    }),
  ])

  if (!finished.ok) {
    return { matches: known.matches, unmatched: [...known.unmatched, ...failed(known.unknown)] }
  }
  return {
    matches: [...known.matches, ...finished.result.matches],
    unmatched: [...known.unmatched, ...finished.result.unmatched],
  }
}
