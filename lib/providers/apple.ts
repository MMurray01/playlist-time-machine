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
  }
}

export function appleArtworkUrl(template: string | undefined): string | null {
  if (!template) return null
  return template.replace("{w}", "300").replace("{h}", "300").replace("{f}", "jpg")
}

export function appleSongToCandidate(song: AppleSongJson): CatalogCandidate | null {
  if (!song.id || !song.attributes?.name) return null
  return {
    id: song.id,
    title: song.attributes.name,
    artist: song.attributes.artistName ?? "",
    artworkUrl: appleArtworkUrl(song.attributes.artwork?.url),
    url: song.attributes.url ?? null,
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

export function createAppleSearcher(fetchImpl: typeof fetch, developerToken: string, storefront = "us") {
  return async (hit: { title: string; artist: string }): Promise<CatalogCandidate[]> => {
    const params = new URLSearchParams({
      term: `${hit.title} ${hit.artist}`,
      types: "songs",
      limit: "5",
    })
    const response = await fetchImpl(
      `https://api.music.apple.com/v1/catalog/${storefront}/search?${params.toString()}`,
      { headers: appleHeaders(developerToken) },
    )
    if (!response.ok) throw new Error(`apple_search_${response.status}`)
    const body = (await response.json()) as {
      results?: { songs?: { data?: AppleSongJson[] } }
    }
    return (body.results?.songs?.data ?? [])
      .map(appleSongToCandidate)
      .filter((candidate): candidate is CatalogCandidate => candidate != null)
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
