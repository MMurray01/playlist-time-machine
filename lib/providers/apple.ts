import { chunk } from "@/lib/providers/batch"
import type { CatalogCandidate, PlaylistCreateResult } from "@/lib/playlist/types"

/**
 * Apple Music can take the songs on the create call, then more on the
 * add-tracks call. One-song requests drop tracks, so each call carries a batch.
 * 100 matches the largest page the playlist-tracks relationship documents.
 */
export const APPLE_TRACKS_PER_REQUEST = 100

interface AppleSongJson {
  id?: string
  attributes?: {
    name?: string
    artistName?: string
    url?: string
    artwork?: { url?: string }
    previews?: { url?: string }[]
  }
}

/** List covers stay small. The song detail asks for a larger file from the same template. */
export const ARTWORK_LIST_SIZE = 240
export const ARTWORK_DETAIL_SIZE = 800

export function appleArtworkUrl(template: string | undefined, size = ARTWORK_LIST_SIZE): string | null {
  if (!template) return null
  return template.replace("{w}", String(size)).replace("{h}", String(size)).replace("{f}", "jpg")
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

export function appleSongToCandidate(song: AppleSongJson): CatalogCandidate | null {
  if (!song.id || !song.attributes?.name) return null
  const template = song.attributes.artwork?.url
  return {
    id: song.id,
    title: song.attributes.name,
    artist: song.attributes.artistName ?? "",
    artworkUrl: appleArtworkUrl(template, ARTWORK_LIST_SIZE),
    artworkLargeUrl: appleArtworkUrl(template, ARTWORK_DETAIL_SIZE),
    previewUrl: httpsUrl(song.attributes.previews?.find((preview) => preview.url)?.url),
    url: httpsUrl(song.attributes.url),
  }
}

function appleHeaders(developerToken: string, userToken?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${developerToken}`,
    "Content-Type": "application/json",
  }
  if (userToken) headers["Music-User-Token"] = userToken
  return headers
}

const APPLE_SONG_ID = /^[0-9]{2,18}$/

function songsFrom(body: { data?: AppleSongJson[]; results?: { songs?: { data?: AppleSongJson[] } } }): CatalogCandidate[] {
  const rows = body.data ?? body.results?.songs?.data ?? []
  return rows
    .map(appleSongToCandidate)
    .filter((candidate): candidate is CatalogCandidate => candidate != null)
}

export function createAppleSearcher(fetchImpl: typeof fetch, developerToken: string, storefront = "us") {
  return async (hit: { title: string; artist: string; appleSongId?: string | null }): Promise<CatalogCandidate[]> => {
    const headers = appleHeaders(developerToken)
    const found: CatalogCandidate[] = []
    const storedId = hit.appleSongId && APPLE_SONG_ID.test(hit.appleSongId) ? hit.appleSongId : null

    if (storedId) {
      const direct = await fetchImpl(`https://api.music.apple.com/v1/catalog/${storefront}/songs/${storedId}`, {
        headers,
      })
      if (direct.status === 401 || direct.status === 403) throw new Error(`apple_search_${direct.status}`)
      if (direct.ok) {
        found.push(...songsFrom((await direct.json()) as { data?: AppleSongJson[] }))
      } else if (direct.status !== 404) {
        throw new Error(`apple_search_${direct.status}`)
      }
    }

    const params = new URLSearchParams({
      term: `${hit.title} ${hit.artist}`,
      types: "songs",
      limit: "5",
    })
    const response = await fetchImpl(
      `https://api.music.apple.com/v1/catalog/${storefront}/search?${params.toString()}`,
      { headers },
    )
    if (!response.ok) {
      if (found.length > 0) return found
      throw new Error(`apple_search_${response.status}`)
    }
    const searched = songsFrom(
      (await response.json()) as { results?: { songs?: { data?: AppleSongJson[] } } },
    )
    const seen = new Set<string>()
    return [...found, ...searched].filter((candidate) => {
      if (seen.has(candidate.id)) return false
      seen.add(candidate.id)
      return true
    })
  }
}

function songRefs(ids: string[]): { id: string; type: "songs" }[] {
  return ids.map((id) => ({ id, type: "songs" as const }))
}

export async function createAppleMusicPlaylist(
  fetchImpl: typeof fetch,
  input: {
    developerToken: string
    userToken: string
    name: string
    description: string
    songIds: string[]
  },
): Promise<PlaylistCreateResult> {
  const songIds = input.songIds.filter(Boolean)
  const base: PlaylistCreateResult = {
    ok: false,
    playlistId: null,
    playlistUrl: null,
    addedCount: 0,
    requestedCount: songIds.length,
    error: "No songs to add.",
    status: null,
  }
  if (songIds.length === 0) return base

  const batches = chunk(songIds, APPLE_TRACKS_PER_REQUEST)
  const headers = appleHeaders(input.developerToken, input.userToken)
  const createResponse = await fetchImpl("https://api.music.apple.com/v1/me/library/playlists", {
    method: "POST",
    headers,
    body: JSON.stringify({
      attributes: {
        name: input.name,
        description: input.description,
      },
      relationships: {
        tracks: { data: songRefs(batches[0]) },
      },
    }),
  })
  if (!createResponse.ok) {
    return { ...base, error: "Apple Music could not create the playlist.", status: createResponse.status }
  }

  const created = (await createResponse.json()) as {
    data?: { id?: string; attributes?: { url?: string } }[]
  }
  const playlist = created.data?.[0]
  const playlistId = playlist?.id ?? null
  if (!playlistId) {
    return { ...base, error: "Apple Music did not return a playlist.", status: createResponse.status }
  }

  let added = batches[0].length
  const playlistUrl = playlist?.attributes?.url ?? null
  for (const batch of batches.slice(1)) {
    const addOnce = () =>
      fetchImpl(`https://api.music.apple.com/v1/me/library/playlists/${encodeURIComponent(playlistId)}/tracks`, {
        method: "POST",
        headers,
        body: JSON.stringify({ data: songRefs(batch) }),
      })
    let addResponse = await addOnce()
    if (!addResponse.ok) addResponse = await addOnce()
    if (!addResponse.ok) {
      return {
        ok: false,
        playlistId,
        playlistUrl,
        addedCount: added,
        requestedCount: songIds.length,
        error: "Apple Music saved only part of the playlist.",
        status: addResponse.status,
      }
    }
    added += batch.length
  }

  return {
    ok: true,
    playlistId,
    playlistUrl,
    addedCount: added,
    requestedCount: songIds.length,
    error: null,
    status: null,
  }
}
