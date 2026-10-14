import { createHash, generateKeyPairSync } from "node:crypto"
import { importSPKI, jwtVerify } from "jose"
import { describe, expect, it } from "vitest"
import { APPLE_TRACKS_PER_REQUEST, createAppleMusicPlaylist } from "@/lib/providers/apple"
import { signAppleDeveloperToken } from "@/lib/providers/apple-token"
import { chunk } from "@/lib/providers/batch"
import { buildTokenExchange, createPkcePair } from "@/lib/providers/pkce"
import { createSpotifyPlaylist, SPOTIFY_TRACKS_PER_REQUEST } from "@/lib/providers/spotify"
import { matchHits } from "@/lib/providers/match-hits"

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

describe("provider batches", () => {
  it("splits tracks into the largest request the API allows", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
    expect(SPOTIFY_TRACKS_PER_REQUEST).toBe(100)
    expect(APPLE_TRACKS_PER_REQUEST).toBe(100)
  })

  it("adds Spotify songs in batches of 100 instead of one at a time", async () => {
    const calls: { url: string; body?: unknown }[] = []
    const ids = Array.from({ length: 217 }, (_, index) => `track${index.toString().padStart(18, "a")}`)
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input)
      const body = init?.body ? JSON.parse(String(init.body)) : undefined
      calls.push({ url, body })
      if (url.endsWith("/v1/me")) return jsonResponse({ id: "user_1" })
      if (url.includes("/users/user_1/playlists")) {
        return jsonResponse({ id: "playlist_1", external_urls: { spotify: "https://open.spotify.com/playlist/playlist_1" } })
      }
      if (url.includes("fields=tracks.total")) return jsonResponse({ tracks: { total: 217 } })
      return jsonResponse({ snapshot_id: "snap" }, 201)
    }

    const result = await createSpotifyPlaylist(fetchImpl, {
      token: "token",
      name: "Class of 1984",
      description: "Chart order",
      trackIds: ids,
    })

    const adds = calls.filter((call) => call.url.endsWith("/playlists/playlist_1/tracks"))
    expect(adds).toHaveLength(3)
    expect((adds[0]?.body as { uris: string[] }).uris).toHaveLength(100)
    expect((adds[1]?.body as { uris: string[] }).uris).toHaveLength(100)
    expect((adds[2]?.body as { uris: string[] }).uris).toHaveLength(17)
    expect(result).toMatchObject({ ok: true, addedCount: 217, requestedCount: 217 })
  })

  it("reports a partial Spotify save instead of pretending every song was added", async () => {
    let addCalls = 0
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input)
      if (url.endsWith("/v1/me")) return jsonResponse({ id: "user_1" })
      if (url.includes("/users/user_1/playlists")) return jsonResponse({ id: "playlist_1", external_urls: { spotify: "https://open.spotify.com/playlist/playlist_1" } })
      addCalls += 1
      return new Response("no", { status: 500 })
    }
    const result = await createSpotifyPlaylist(fetchImpl, {
      token: "token",
      name: "Class of 1984",
      description: "Chart order",
      trackIds: ["aaaaaaaaaaaaaaaaaaaa"],
    })
    expect(addCalls).toBe(2)
    expect(result.ok).toBe(false)
    expect(result.addedCount).toBe(0)
    expect(result.error).toMatch(/part of the playlist/)
  })

  it("puts the first Apple Music batch on the create call and the rest on batch adds", async () => {
    const calls: { url: string; count: number }[] = []
    const ids = Array.from({ length: 217 }, (_, index) => String(1000 + index))
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input)
      const body = JSON.parse(String(init?.body)) as { data?: { id: string }[]; relationships?: { tracks: { data: { id: string }[] } } }
      const count = body.data?.length ?? body.relationships?.tracks.data.length ?? 0
      calls.push({ url, count })
      if (url.endsWith("/me/library/playlists")) {
        return jsonResponse({ data: [{ id: "p.1", attributes: { url: "https://music.apple.com/playlist/p.1" } }] })
      }
      return jsonResponse({ data: [] })
    }

    const result = await createAppleMusicPlaylist(fetchImpl, {
      developerToken: "dev",
      userToken: "user",
      name: "Class of 1984",
      description: "Chart order",
      songIds: ids,
    })

    expect(calls.map((call) => call.count)).toEqual([100, 100, 17])
    expect(calls[0]?.url).toBe("https://api.music.apple.com/v1/me/library/playlists")
    expect(calls[1]?.url).toContain("/playlists/p.1/tracks")
    expect(result).toMatchObject({
      ok: true,
      addedCount: 217,
      playlistUrl: "https://music.apple.com/playlist/p.1",
    })
  })

  it("uses one Apple Music call when the songs fit in a single batch", async () => {
    const calls: string[] = []
    const fetchImpl: typeof fetch = async (input) => {
      calls.push(String(input))
      return jsonResponse({ data: [{ id: "p.2", attributes: { url: "https://music.apple.com/playlist/p.2" } }] })
    }
    const result = await createAppleMusicPlaylist(fetchImpl, {
      developerToken: "dev",
      userToken: "user",
      name: "Short",
      description: "Short",
      songIds: ["123", "456"],
    })
    expect(calls).toHaveLength(1)
    expect(result.addedCount).toBe(2)
  })
})

describe("matching with a mocked catalog", () => {
  it("counts matched songs and lists the ones the catalog does not have", async () => {
    const lookup = await matchHits(
      [
        { key: "1", title: "Le Freak", artist: "Chic" },
        { key: "2", title: "Missing Song", artist: "Nobody" },
      ],
      async (hit) => {
        if (hit.title === "Missing Song") return []
        return [{ id: "abc", title: hit.title, artist: hit.artist, artworkUrl: "https://example.test/a.jpg", url: null }]
      },
    )
    expect(lookup.matches.map((match) => match.catalogId)).toEqual(["abc"])
    expect(lookup.unmatched).toEqual([
      { key: "2", title: "Missing Song", artist: "Nobody", reason: "not_in_catalog" },
    ])
  })

  it("marks a failed search separately from a genuine miss", async () => {
    const lookup = await matchHits([{ key: "1", title: "Le Freak", artist: "Chic" }], async () => {
      throw new Error("spotify_search_500")
    })
    expect(lookup.unmatched[0]?.reason).toBe("search_failed")
  })
})

describe("Spotify PKCE and Apple developer tokens", () => {
  it("sends the code verifier and the client secret when one is configured", () => {
    const pair = createPkcePair()
    expect(pair.challenge).toBe(createHash("sha256").update(pair.verifier).digest("base64url"))
    const withSecret = buildTokenExchange({
      clientId: "client",
      clientSecret: "secret",
      code: "code",
      redirectUri: "http://localhost:3000/callback",
      verifier: pair.verifier,
    })
    expect(withSecret.headers.Authorization).toMatch(/^Basic /)
    expect(withSecret.body).toContain("code_verifier=")
    const withoutSecret = buildTokenExchange({
      clientId: "client",
      code: "code",
      redirectUri: "http://localhost:3000/callback",
      verifier: pair.verifier,
    })
    expect(withoutSecret.headers.Authorization).toBeUndefined()
  })

  it("signs an Apple Music developer token with the team and key ids", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" })
    const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString()
    const token = await signAppleDeveloperToken({
      teamId: "TEAMID1234",
      keyId: "KEYID12345",
      privateKey: pem.replace(/\n/g, "\\n"),
    })
    const spki = publicKey.export({ type: "spki", format: "pem" }).toString()
    const verified = await jwtVerify(token, await importSPKI(spki, "ES256"), { issuer: "TEAMID1234" })
    expect(verified.protectedHeader).toMatchObject({ alg: "ES256", kid: "KEYID12345" })
  })
})
