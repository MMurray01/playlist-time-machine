import { createAppleSearcher, searchAppleMusicSongs } from "@/lib/providers/apple"
import { createItunesSearcher } from "@/lib/providers/itunes"
import { chooseCatalogMatch, searchQueries } from "@/lib/playlist/match"
import type { CatalogCandidate } from "@/lib/playlist/types"

export interface CatalogHit {
  title: string
  artist: string
  appleSongId?: string | null
  isrc?: string | null
}

function mergeCandidate(current: CatalogCandidate, next: CatalogCandidate): CatalogCandidate {
  return {
    id: current.id,
    title: next.title || current.title,
    artist: next.artist || current.artist,
    artworkUrl: next.artworkUrl ?? current.artworkUrl,
    artworkLargeUrl: next.artworkLargeUrl ?? current.artworkLargeUrl,
    previewUrl: next.previewUrl ?? current.previewUrl,
    url: next.url ?? current.url,
  }
}

function hasCoverAndPreview(
  hit: { title: string; artist: string },
  candidates: CatalogCandidate[],
): boolean {
  const match = chooseCatalogMatch(hit, candidates)
  return Boolean(match?.artworkUrl && match.previewUrl)
}

/**
 * Apple Music catalog first, then the public iTunes Search API.
 * A stored song id and an ISRC are tried when the chart row has them.
 * Searches stop once a title-and-artist match has both a cover and a preview.
 * An empty result is returned only after the fallbacks finish. Callers should
 * not cache that empty result.
 */
export function createCatalogSearcher(
  fetchImpl: typeof fetch,
  options?: { developerToken?: string | null; storefront?: string },
) {
  const storefront = options?.storefront ?? "us"
  const developerToken = options?.developerToken ?? null
  const itunes = createItunesSearcher(fetchImpl)

  return async (hit: CatalogHit): Promise<CatalogCandidate[]> => {
    const collected: CatalogCandidate[] = []
    const add = (rows: CatalogCandidate[]) => {
      for (const row of rows) {
        if (!row.id) continue
        const index = collected.findIndex((item) => item.id === row.id)
        if (index === -1) collected.push(row)
        else collected[index] = mergeCandidate(collected[index]!, row)
      }
    }

    let appleOk = Boolean(developerToken)
    if (developerToken) {
      try {
        add(await createAppleSearcher(fetchImpl, developerToken, storefront)(hit))
      } catch {
        appleOk = false
      }
      if (appleOk && !hasCoverAndPreview(hit, collected)) {
        for (const term of searchQueries(hit).slice(1)) {
          try {
            add(await searchAppleMusicSongs(fetchImpl, developerToken, { term, storefront, limit: 10 }))
          } catch {
            appleOk = false
            break
          }
          if (hasCoverAndPreview(hit, collected)) break
        }
      }
      if (appleOk && hit.isrc && !hasCoverAndPreview(hit, collected)) {
        try {
          add(await searchAppleMusicSongs(fetchImpl, developerToken, { isrc: hit.isrc, storefront }))
        } catch {
          appleOk = false
        }
      }
    }

    let itunesFailed = false
    if (!hasCoverAndPreview(hit, collected)) {
      for (const term of searchQueries(hit)) {
        try {
          add(await itunes({ term }))
        } catch {
          itunesFailed = true
          break
        }
        if (hasCoverAndPreview(hit, collected)) break
      }
      if (hit.isrc && !itunesFailed && !hasCoverAndPreview(hit, collected)) {
        try {
          add(await itunes({ term: hit.isrc, isrc: true }))
        } catch {
          itunesFailed = true
        }
      }
    }

    const match = chooseCatalogMatch(hit, collected)
    if (!match && itunesFailed) throw new Error("catalog_search_failed")
    return collected
  }
}
