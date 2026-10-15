import { describe, expect, it } from "vitest"
import { dealWall, mixEras, shuffle, thumbnailCoverUrl, wallMotionEnabled, wallTileCount } from "@/lib/hero/wall"

function sequence(values: number[]): () => number {
  let index = 0
  return () => {
    const value = values[index] ?? 0
    index += 1
    return value
  }
}

describe("hero cover wall", () => {
  it("asks the catalog for a small thumb", () => {
    const source =
      "https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/dc/5d/6d/example/cover.jpg/240x240bb.jpg"
    expect(thumbnailCoverUrl(source)).toBe(
      "https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/dc/5d/6d/example/cover.jpg/100x100bb.jpg",
    )
    expect(thumbnailCoverUrl("http://example.test/a.jpg")).toBeNull()
  })

  it("mixes early and late catalog art instead of one era", () => {
    const covers = Array.from({ length: 8 }, (_, id) => ({ id, src: `https://example.test/${id}.jpg` }))
    const mixed = mixEras(covers, 4, () => 0.999)
    expect(mixed).toEqual([
      "https://example.test/0.jpg",
      "https://example.test/2.jpg",
      "https://example.test/4.jpg",
      "https://example.test/6.jpg",
      "https://example.test/1.jpg",
      "https://example.test/3.jpg",
      "https://example.test/5.jpg",
      "https://example.test/7.jpg",
    ])
  })

  it("deals a fresh set and keeps the rest for later swaps", () => {
    const urls = ["a", "b", "c", "d", "e"]
    const dealt = dealWall(urls, 2, sequence([0, 0, 0, 0]))
    expect(dealt.tiles).toHaveLength(2)
    expect(new Set([...dealt.tiles, ...dealt.spares])).toEqual(new Set(urls))
    expect(dealt.tiles.some((url) => dealt.spares.includes(url))).toBe(false)
    expect(shuffle([1, 2, 3], () => 0)).toEqual([2, 3, 1])
  })

  it("uses fewer tiles on a narrow screen and skips motion when asked", () => {
    expect(wallTileCount(true)).toBe(40)
    expect(wallTileCount(false)).toBe(12)
    expect(wallMotionEnabled(false, false)).toBe(true)
    expect(wallMotionEnabled(true, false)).toBe(false)
    expect(wallMotionEnabled(false, true)).toBe(false)
  })
})
