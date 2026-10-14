import { ARTWORK_DETAIL_SIZE, ARTWORK_LIST_SIZE } from "@/lib/providers/apple"
import type { CatalogCandidate } from "@/lib/playlist/types"

interface ItunesSongJson {
  trackId?: number
  trackName?: string
  artistName?: string
  artworkUrl100?: string
  previewUrl?: string
  trackViewUrl?: string
}

function httpsUrl(value: string | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === "https:" ? url.toString() : null
  } catch {
    return null
  }
}

/** iTunes artwork URLs encode the pixel size. Swap it for the size this page uses. */
export function itunesArtworkUrl(template: string | undefined, size: number): string | null {
  if (!template) return null
  return httpsUrl(template.replace(/(\d+)x(\d+)(bb)?/i, `${size}x${size}$3`))
}

export function itunesSongToCandidate(song: ItunesSongJson): CatalogCandidate | null {
  if (song.trackId == null || !song.trackName) return null
  return {
    id: String(song.trackId),
    title: song.trackName,
    artist: song.artistName ?? "",
    artworkUrl: itunesArtworkUrl(song.artworkUrl100, ARTWORK_LIST_SIZE),
    artworkLargeUrl: itunesArtworkUrl(song.artworkUrl100, ARTWORK_DETAIL_SIZE),
    previewUrl: httpsUrl(song.previewUrl),
    url: httpsUrl(song.trackViewUrl),
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function createItunesSearcher(fetchImpl: typeof fetch, country = "us") {
  return async (input: { term: string; isrc?: boolean }): Promise<CatalogCandidate[]> => {
    const params = new URLSearchParams({
      term: input.term,
      entity: "song",
      limit: "10",
      country,
    })
    if (input.isrc) params.set("attribute", "isrc")
    const url = `https://itunes.apple.com/search?${params.toString()}`

    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await fetchImpl(url, { headers: { "User-Agent": "Mozilla/5.0" } })
      if (response.status === 429 || response.status === 403) {
        if (attempt < 2) {
          await sleep(400 * (attempt + 1))
          continue
        }
        throw new Error(`itunes_search_${response.status}`)
      }
      if (!response.ok) throw new Error(`itunes_search_${response.status}`)
      const body = (await response.json()) as { results?: ItunesSongJson[] }
      return (body.results ?? [])
        .map(itunesSongToCandidate)
        .filter((candidate): candidate is CatalogCandidate => candidate != null)
    }

    throw new Error("itunes_search_failed")
  }
}
