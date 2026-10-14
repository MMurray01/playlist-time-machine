import type { CatalogCandidate } from "@/lib/playlist/types"

const TTL_MS = 6 * 60 * 60 * 1000
const MAX_ENTRIES = 2000

const cache = new Map<string, { expires: number; value: CatalogCandidate[] }>()

export function catalogCacheKey(hit: {
  title: string
  artist: string
  appleSongId?: string | null
  isrc?: string | null
}): string {
  return `v2|${hit.appleSongId ?? ""}|${hit.isrc ?? ""}|${hit.title.trim().toLowerCase()}|${hit.artist.trim().toLowerCase()}`
}

export function readCatalogCache(key: string, now = Date.now()): CatalogCandidate[] | undefined {
  const entry = cache.get(key)
  if (!entry) return undefined
  if (entry.expires <= now) {
    cache.delete(key)
    return undefined
  }
  return entry.value
}

export function writeCatalogCache(key: string, value: CatalogCandidate[], now = Date.now()): void {
  if (value.length === 0) return
  if (cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next().value
    if (oldest) cache.delete(oldest)
  }
  cache.set(key, { expires: now + TTL_MS, value })
}
