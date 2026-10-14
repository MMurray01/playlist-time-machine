import { describe, expect, it } from "vitest"
import catalogFile from "@/data/catalog-matches.json"
import { partitionStaticTracks, type CatalogMatchRecord, type StaticCatalogFile } from "@/lib/playlist/catalog-static"

const ART =
  "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/42/b7/db/42b7dbe1-d13f-c600-5b78-daa57c5d0f08/cover.jpg/100x100bb.jpg"

describe("static catalog matches", () => {
  const songs: Record<string, CatalogMatchRecord | null> = {
    "91": {
      catalogId: "123",
      artworkUrl: ART,
      previewUrl: "https://audio-ssl.itunes.apple.com/preview.m4a",
      url: "https://music.apple.com/us/song/123",
    },
    "92": null,
  }

  it("resolves a shipped match without searching", () => {
    const split = partitionStaticTracks(
      [{ key: "song:91", title: "Too Much Heaven", artist: "Bee Gees" }],
      songs,
    )
    expect(split.unknown).toHaveLength(0)
    expect(split.unmatched).toHaveLength(0)
    expect(split.matches[0]).toMatchObject({
      catalogId: "123",
      artworkUrl: ART.replace("100x100bb.jpg", "240x240bb.jpg"),
      artworkLargeUrl: ART.replace("100x100bb.jpg", "800x800bb.jpg"),
      previewUrl: "https://audio-ssl.itunes.apple.com/preview.m4a",
    })
  })

  it("treats a checked miss as not in the catalog", () => {
    const split = partitionStaticTracks([{ key: "song:92", title: "Le Freak", artist: "Chic" }], songs)
    expect(split.matches).toHaveLength(0)
    expect(split.unknown).toHaveLength(0)
    expect(split.unmatched[0]?.reason).toBe("not_in_catalog")
  })

  it("leaves songs that are not in the file for a later lookup", () => {
    const split = partitionStaticTracks([{ key: "song:999999", title: "New", artist: "Someone" }], songs)
    expect(split.unknown).toHaveLength(1)
    expect(split.matches).toHaveLength(0)
  })
})

describe("shipped catalog file", () => {
  const file = catalogFile as StaticCatalogFile

  it("has a precomputed row for every song in the library", () => {
    expect(file.version).toBe(1)
    expect(Object.keys(file.songs)).toHaveLength(1593)
    const heaven = file.songs["91"]
    expect(heaven?.catalogId).toBeTruthy()
    expect(heaven?.artworkUrl).toContain("mzstatic.com")
    expect(heaven?.previewUrl).toMatch(/^https:\/\//)
  })
})
