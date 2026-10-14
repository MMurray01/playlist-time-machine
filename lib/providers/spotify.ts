import { chunk } from "@/lib/providers/batch"
import { chooseCatalogMatch } from "@/lib/playlist/match"
import type { CatalogCandidate, MatchTrack, PlaylistCreateResult } from "@/lib/playlist/types"

/** Spotify accepts at most 100 track URIs in one add request. */
export const SPOTIFY_TRACKS_PER_REQUEST = 100

interface SpotifyTrackJson {
  id?: string
  name?: string
  artists?: { name?: string }[]
  album?: { images?: { url?: string; width?: number }[] }
  external_urls?: { spotify?: string }
}

function artworkFrom(track: SpotifyTrackJson): string | null {
  const images = track.album?.images?.filter((image) => image.url) ?? []
  if (images.length === 0) return null
  const sorted = [...images].sort(
    (a, b) => Math.abs((a.width ?? 0) - 640) - Math.abs((b.width ?? 0) - 640),
  )
  return sorted[0]?.url ?? null
}

export function spotifyTrackToCandidate(track: SpotifyTrackJson): CatalogCandidate | null {
  if (!track.id || !track.name) return null
  const artist = (track.artists ?? [])
    .map((entry) => entry.name?.trim())
    .filter((name): name is string => Boolean(name))
    .join(", ")
  return {
    id: track.id,
    title: track.name,
    artist,
    artworkUrl: artworkFrom(track),
    url: track.external_urls?.spotify ?? null,
  }
}

function authHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  }
}

export function createSpotifySearcher(fetchImpl: typeof fetch, token: string) {
  return async (hit: MatchTrack): Promise<CatalogCandidate[]> => {
    if (hit.spotifyTrackId) {
      const direct = await fetchImpl(`https://api.spotify.com/v1/tracks/${encodeURIComponent(hit.spotifyTrackId)}`, {
        headers: authHeaders(token),
      })
      if (direct.status === 401) {
        throw new Error("spotify_unauthorized")
      }
      if (direct.ok) {
        const track = (await direct.json()) as SpotifyTrackJson
        const candidate = spotifyTrackToCandidate(track)
        if (candidate) return [candidate]
      }
    }

    const query = `track:"${hit.title.replace(/"/g, "")}" artist:"${hit.artist.replace(/"/g, "")}"`
    const params = new URLSearchParams({ q: query, type: "track", limit: "5" })
    const response = await fetchImpl(`https://api.spotify.com/v1/search?${params.toString()}`, {
      headers: authHeaders(token),
    })
    if (response.status === 401) throw new Error("spotify_unauthorized")
    if (!response.ok) throw new Error(`spotify_search_${response.status}`)
    const body = (await response.json()) as { tracks?: { items?: SpotifyTrackJson[] } }
    return (body.tracks?.items ?? [])
      .map(spotifyTrackToCandidate)
      .filter((candidate): candidate is CatalogCandidate => candidate != null)
  }
}

export async function chooseSpotifyMatch(
  fetchImpl: typeof fetch,
  token: string,
  hit: MatchTrack,
): Promise<CatalogCandidate | null> {
  const candidates = await createSpotifySearcher(fetchImpl, token)(hit)
  if (hit.spotifyTrackId) {
    return candidates.find((candidate) => candidate.id === hit.spotifyTrackId) ?? candidates[0] ?? null
  }
  return chooseCatalogMatch(hit, candidates)
}

async function spotifyJson(response: Response): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>
  } catch {
    return {}
  }
}

export async function createSpotifyPlaylist(
  fetchImpl: typeof fetch,
  input: { token: string; name: string; description: string; trackIds: string[] },
): Promise<PlaylistCreateResult> {
  const trackIds = input.trackIds.filter(Boolean)
  const empty: PlaylistCreateResult = {
    ok: false,
    playlistId: null,
    playlistUrl: null,
    addedCount: 0,
    requestedCount: trackIds.length,
    error: "No songs to add.",
    status: null,
  }
  if (trackIds.length === 0) return empty

  const headers = authHeaders(input.token)
  const meResponse = await fetchImpl("https://api.spotify.com/v1/me", { headers })
  if (meResponse.status === 401) {
    return { ...empty, error: "Spotify sign-in expired.", status: 401 }
  }
  if (!meResponse.ok) {
    return { ...empty, error: "Spotify could not open your account.", status: meResponse.status }
  }
  const me = await spotifyJson(meResponse)
  const userId = typeof me.id === "string" ? me.id : ""
  if (!userId) {
    return { ...empty, error: "Spotify did not return an account id.", status: meResponse.status }
  }

  const createResponse = await fetchImpl(`https://api.spotify.com/v1/users/${encodeURIComponent(userId)}/playlists`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: input.name,
      description: input.description,
      public: false,
    }),
  })
  if (!createResponse.ok) {
    return {
      ...empty,
      error: "Spotify could not create the playlist.",
      status: createResponse.status,
    }
  }
  const created = await spotifyJson(createResponse)
  const playlistId = typeof created.id === "string" ? created.id : null
  const external = created.external_urls as { spotify?: string } | undefined
  const playlistUrl = external?.spotify ?? null
  if (!playlistId) {
    return { ...empty, error: "Spotify did not return a playlist.", status: createResponse.status }
  }

  const uris = trackIds.map((id) => (id.startsWith("spotify:track:") ? id : `spotify:track:${id}`))
  const batches = chunk(uris, SPOTIFY_TRACKS_PER_REQUEST)
  let added = 0
  for (const batch of batches) {
    const addOnce = () =>
      fetchImpl(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        method: "POST",
        headers,
        body: JSON.stringify({ uris: batch }),
      })
    let addResponse = await addOnce()
    if (!addResponse.ok) addResponse = await addOnce()
    if (!addResponse.ok) {
      return {
        ok: false,
        playlistId,
        playlistUrl,
        addedCount: added,
        requestedCount: uris.length,
        error: "Spotify saved only part of the playlist.",
        status: addResponse.status,
      }
    }
    added += batch.length
  }

  let addedCount = added
  const verified = await fetchImpl(
    `https://api.spotify.com/v1/playlists/${playlistId}?fields=tracks.total,external_urls`,
    { headers },
  )
  if (verified.ok) {
    const body = await spotifyJson(verified)
    const tracks = body.tracks as { total?: number } | undefined
    const urls = body.external_urls as { spotify?: string } | undefined
    if (typeof tracks?.total === "number") addedCount = tracks.total
    return {
      ok: addedCount === uris.length,
      playlistId,
      playlistUrl: urls?.spotify ?? playlistUrl,
      addedCount,
      requestedCount: uris.length,
      error: addedCount === uris.length ? null : "Spotify saved only part of the playlist.",
      status: null,
    }
  }

  return {
    ok: added === uris.length,
    playlistId,
    playlistUrl,
    addedCount: added,
    requestedCount: uris.length,
    error: added === uris.length ? null : "Spotify saved only part of the playlist.",
    status: null,
  }
}
