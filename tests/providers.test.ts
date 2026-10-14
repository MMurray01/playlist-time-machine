import { generateKeyPairSync } from "node:crypto"
import { importSPKI, jwtVerify } from "jose"
import { describe, expect, it } from "vitest"
import {
  APPLE_TRACKS_PER_REQUEST,
  ARTWORK_DETAIL_SIZE,
  ARTWORK_LIST_SIZE,
  appleSongToCandidate,
  createAppleMusicPlaylist,
  createAppleSearcher,
} from "@/lib/providers/apple"
import { catalogCacheKey, readCatalogCache, writeCatalogCache } from "@/lib/server/catalog-cache"
import { signAppleDeveloperToken } from "@/lib/providers/apple-token"
import { chunk } from "@/lib/providers/batch"
import { createCatalogSearcher } from "@/lib/providers/catalog-search"
import { chooseCatalogMatch } from "@/lib/playlist/match"
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
    expect(APPLE_TRACKS_PER_REQUEST).toBe(100)
  })

  it("puts the first Apple Music batch on the create call and the rest on batch adds", async () => {
    const calls: { url: string; count: number }[] = []
    const ids = Array.from({ length: 255 }, (_, index) => String(1000 + index))
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

    expect(calls.map((call) => call.count)).toEqual([100, 100, 55])
    expect(calls[0]?.url).toBe("https://api.music.apple.com/v1/me/library/playlists")
    expect(calls[1]?.url).toContain("/playlists/p.1/tracks")
    expect(result).toMatchObject({
      ok: true,
      addedCount: 255,
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
      throw new Error("apple_search_500")
    })
    expect(lookup.unmatched[0]?.reason).toBe("search_failed")
  })
})

describe("Apple Music catalog matching", () => {
  it("prefers a stored song id when that recording matches, and searches when it does not", async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input)
      if (url.endsWith("/songs/999")) {
        return jsonResponse({
          data: [{ id: "999", attributes: { name: "Le Freak", artistName: "Chic", artwork: { url: "https://example.test/{w}x{h}.jpg" } } }],
        })
      }
      if (url.endsWith("/songs/111")) {
        return jsonResponse({ data: [{ id: "111", attributes: { name: "Other Song", artistName: "Other Artist" } }] })
      }
      return jsonResponse({
        results: { songs: { data: [{ id: "222", attributes: { name: "Le Freak", artistName: "Chic" } }] } },
      })
    }
    const search = createAppleSearcher(fetchImpl, "dev")
    const stored = await search({ title: "Le Freak", artist: "Chic", appleSongId: "999" })
    expect(chooseCatalogMatch({ title: "Le Freak", artist: "Chic" }, stored)?.id).toBe("999")
    const wrong = await search({ title: "Le Freak", artist: "Chic", appleSongId: "111" })
    expect(chooseCatalogMatch({ title: "Le Freak", artist: "Chic" }, wrong)?.id).toBe("222")
  })

  it("requests a small list cover, a larger detail cover, and an https preview", () => {
    const candidate = appleSongToCandidate({
      id: "1",
      attributes: {
        name: "Le Freak",
        artistName: "Chic",
        url: "https://music.apple.com/us/song/le-freak/1",
        artwork: { url: "https://example.test/{w}x{h}bb.{f}" },
        previews: [{ url: "https://example.test/preview.m4a" }],
      },
    })
    expect(candidate?.artworkUrl).toBe(`https://example.test/${ARTWORK_LIST_SIZE}x${ARTWORK_LIST_SIZE}bb.jpg`)
    expect(candidate?.artworkLargeUrl).toBe(`https://example.test/${ARTWORK_DETAIL_SIZE}x${ARTWORK_DETAIL_SIZE}bb.jpg`)
    expect(candidate?.previewUrl).toBe("https://example.test/preview.m4a")
    expect(
      appleSongToCandidate({
        id: "2",
        attributes: { name: "Nope", previews: [{ url: "http://insecure.test/no.m4a" }] },
      })?.previewUrl,
    ).toBeNull()
  })

  it("remembers a catalog lookup until the cache expires", () => {
    const key = catalogCacheKey({ title: "Le Freak", artist: "Chic", appleSongId: "999" })
    const value = [{ id: "999", title: "Le Freak", artist: "Chic", artworkUrl: null, url: null }]
    writeCatalogCache(key, value, 1_000)
    expect(readCatalogCache(key, 1_000 + 1_000)).toEqual(value)
    expect(readCatalogCache(key, 1_000 + 6 * 60 * 60 * 1000)).toBeUndefined()
    const emptyKey = catalogCacheKey({ title: "Missing", artist: "Nobody" })
    writeCatalogCache(emptyKey, [], 1_000)
    expect(readCatalogCache(emptyKey, 1_000)).toBeUndefined()
  })

  it("lists a catalog miss without failing the songs that matched", async () => {
    const lookup = await matchHits(
      [
        { key: "1", title: "Le Freak", artist: "Chic" },
        { key: "2", title: "Missing Song", artist: "Nobody" },
      ],
      async (hit) => (hit.title === "Missing Song" ? [] : [{ id: "abc", title: hit.title, artist: hit.artist, artworkUrl: null, url: null }]),
    )
    expect(lookup.matches.map((match) => match.catalogId)).toEqual(["abc"])
    expect(lookup.unmatched[0]).toMatchObject({ key: "2", reason: "not_in_catalog" })
  })
})

describe("catalog search fallbacks", () => {
  it("keeps an Apple Music cover and adds the iTunes preview", async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input)
      if (url.includes("api.music.apple.com")) {
        return jsonResponse({
          results: {
            songs: {
              data: [
                {
                  id: "55",
                  attributes: {
                    name: "Le Freak",
                    artistName: "Chic",
                    artwork: { url: "https://example.test/{w}x{h}bb.{f}" },
                  },
                },
              ],
            },
          },
        })
      }
      return jsonResponse({
        results: [
          {
            trackId: 55,
            trackName: "Le Freak",
            artistName: "Chic",
            artworkUrl100: "https://example.test/100x100bb.jpg",
            previewUrl: "https://example.test/preview.m4a",
            trackViewUrl: "https://music.apple.com/us/song/le-freak/55",
          },
        ],
      })
    }
    const rows = await createCatalogSearcher(fetchImpl, { developerToken: "dev" })({
      title: "Le Freak",
      artist: "Chic",
    })
    const match = chooseCatalogMatch({ title: "Le Freak", artist: "Chic" }, rows)
    expect(match?.id).toBe("55")
    expect(match?.artworkUrl).toBe(`https://example.test/${ARTWORK_LIST_SIZE}x${ARTWORK_LIST_SIZE}bb.jpg`)
    expect(match?.previewUrl).toBe("https://example.test/preview.m4a")
  })

  it("searches iTunes when Apple Music is not configured", async () => {
    const urls: string[] = []
    const fetchImpl: typeof fetch = async (input) => {
      urls.push(String(input))
      if (String(input).includes("attribute=isrc")) {
        return jsonResponse({
          results: [
            {
              trackId: 77,
              trackName: "Le Freak",
              artistName: "Chic",
              artworkUrl100: "https://example.test/100x100bb.jpg",
              previewUrl: "https://example.test/isrc.m4a",
            },
          ],
        })
      }
      return jsonResponse({ results: [] })
    }
    const rows = await createCatalogSearcher(fetchImpl)({
      title: "Le Freak",
      artist: "Chic",
      isrc: "USRC17607839",
    })
    expect(urls.some((url) => url.includes("api.music.apple.com"))).toBe(false)
    expect(urls.some((url) => url.includes("attribute=isrc"))).toBe(true)
    expect(chooseCatalogMatch({ title: "Le Freak", artist: "Chic" }, rows)?.previewUrl).toBe(
      "https://example.test/isrc.m4a",
    )
  })

  it("does not call iTunes after Apple Music already has a cover and a preview", async () => {
    const urls: string[] = []
    const fetchImpl: typeof fetch = async (input) => {
      urls.push(String(input))
      return jsonResponse({
        results: {
          songs: {
            data: [
              {
                id: "55",
                attributes: {
                  name: "Le Freak",
                  artistName: "Chic",
                  artwork: { url: "https://example.test/{w}x{h}bb.{f}" },
                  previews: [{ url: "https://example.test/preview.m4a" }],
                },
              },
            ],
          },
        },
      })
    }
    const rows = await createCatalogSearcher(fetchImpl, { developerToken: "dev" })({
      title: "Le Freak",
      artist: "Chic",
    })
    expect(rows[0]?.previewUrl).toBe("https://example.test/preview.m4a")
    expect(urls.some((url) => url.includes("itunes.apple.com"))).toBe(false)
  })
})

describe("Apple developer tokens", () => {
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
