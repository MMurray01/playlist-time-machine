import { describe, expect, it } from "vitest"
import {
  COLLAGE_FORMATS,
  COLLAGE_MARK,
  collageArtworkUrl,
  collageDescription,
  collageDownloadName,
  collageHeadline,
  collageInviteText,
  collageInviteUrl,
  collageSharePlan,
  isAppleArtworkUrl,
  mosaicHeroKeys,
  planCollage,
  type CollageSource,
  type CollageTile,
} from "@/lib/playlist/collage"

const APPLE =
  "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/42/b7/db/42b7dbe1-d13f-c600-5b78-daa57c5d0f08/06UMGIM50761.rgb.jpg/100x100bb.jpg"

function overlaps(a: CollageTile, b: CollageTile): boolean {
  return a.x < b.x + b.size - 0.05 && a.x + a.size > b.x + 0.05 && a.y < b.y + b.size - 0.05 && a.y + a.size > b.y + 0.05
}

function expectInside(plan: ReturnType<typeof planCollage>) {
  expect(plan.tiles).toHaveLength(plan.tiles.length)
  for (const tile of plan.tiles) {
    expect(tile.x).toBeGreaterThanOrEqual(plan.art.x - 0.05)
    expect(tile.y).toBeGreaterThanOrEqual(plan.art.y - 0.05)
    expect(tile.x + tile.size).toBeLessThanOrEqual(plan.art.x + plan.art.width + 0.05)
    expect(tile.y + tile.size).toBeLessThanOrEqual(plan.art.y + plan.art.height + 0.05)
    expect(tile.size).toBeGreaterThan(8)
  }
  for (let i = 0; i < plan.tiles.length; i += 1) {
    for (let j = i + 1; j < plan.tiles.length; j += 1) {
      expect(overlaps(plan.tiles[i]!, plan.tiles[j]!)).toBe(false)
    }
  }
}

function classOf1984(): CollageSource[] {
  const hits: CollageSource[] = []
  for (let year = 1979; year <= 1989; year += 1) {
    for (let index = 0; index < 20; index += 1) {
      hits.push({
        key: `${year}-${index}`,
        year,
        weeks: index === 3 ? 8 : 1 + (index % 4),
      })
    }
  }
  return hits
}

describe("cover collage", () => {
  it("names the poster the way a class playlist is titled", () => {
    expect(collageHeadline("Class of 1984", 1979, 1989)).toBe("Class of 1984 \u00b7 1979\u20131989")
    expect(collageHeadline("  ", 1979, 1989)).toBe("Playlist \u00b7 1979\u20131989")
  })

  it("uses the two export sizes and a corner mark", () => {
    const square = planCollage({
      format: "square",
      layout: "grid",
      title: "Class of 1984",
      startYear: 1979,
      endYear: 1989,
      hits: classOf1984(),
    })
    const wallpaper = planCollage({
      format: "wallpaper",
      layout: "mosaic",
      title: "Class of 1984",
      startYear: 1979,
      endYear: 1989,
      hits: classOf1984(),
    })
    expect(square.width).toBe(COLLAGE_FORMATS.square.width)
    expect(square.height).toBe(1080)
    expect(wallpaper.width).toBe(1080)
    expect(wallpaper.height).toBe(1920)
    expect(square.mark).toBe(COLLAGE_MARK)
    expect(wallpaper.headline).toBe("Class of 1984 \u00b7 1979\u20131989")
    expect(square.tiles).toHaveLength(220)
    expect(wallpaper.tiles).toHaveLength(220)
    expectInside(square)
    expectInside(wallpaper)
  })

  it("makes each year's longest hit larger in the mosaic", () => {
    const hits = classOf1984()
    const heroes = mosaicHeroKeys(hits)
    expect(heroes).toHaveLength(11)
    expect(heroes).toContain("1984-3")
    const plan = planCollage({
      format: "square",
      layout: "mosaic",
      title: "Class of 1984",
      startYear: 1979,
      endYear: 1989,
      hits,
    })
    expect(plan.heroKeys).toEqual(heroes)
    const hero = plan.tiles.find((tile) => tile.key === "1984-3")
    const ordinary = plan.tiles.find((tile) => tile.key === "1984-0")
    expect(hero && ordinary && hero.size).toBeGreaterThan((ordinary?.size ?? 0) * 1.5)
    expect(plan.tiles.filter((tile) => tile.hero)).toHaveLength(11)
    expectInside(plan)
  })

  it("keeps the earlier song when two runs last the same number of weeks", () => {
    const hits: CollageSource[] = [
      { key: "first", year: 1984, weeks: 4 },
      { key: "second", year: 1984, weeks: 4 },
      { key: "short", year: 1984, weeks: 1 },
    ]
    expect(mosaicHeroKeys(hits)).toEqual(["first"])
  })

  it("loads artwork only from Apple hosts and keeps the file on that host", () => {
    expect(isAppleArtworkUrl(APPLE)).toBe(true)
    expect(isAppleArtworkUrl("http://is1-ssl.mzstatic.com/image/100x100bb.jpg")).toBe(false)
    expect(isAppleArtworkUrl("https://evil.example/image/100x100bb.jpg")).toBe(false)
    expect(isAppleArtworkUrl("https://notmzstatic.com/image/100x100bb.jpg")).toBe(false)
    const sized = collageArtworkUrl(APPLE, 320)
    expect(sized).toBe(APPLE.replace("100x100bb.jpg", "320x320bb.jpg"))
    expect(sized?.startsWith("https://is1-ssl.mzstatic.com/")).toBe(true)
    expect(collageArtworkUrl("https://cdn.example/100x100bb.jpg")).toBeNull()
  })

  it("invites friends back to the share page", () => {
    const headline = collageHeadline("Class of 1984", 1979, 1989)
    const plan = collageSharePlan(headline, "https://playlisttimemachine.com/p/abc?ready=1#year-1984")
    expect(plan.inviteUrl).toBe("https://playlisttimemachine.com/p/abc?ready=1&collage=1")
    expect(plan.text).toBe("Class of 1984 \u00b7 1979\u20131989. A free cover collage. Make your own.")
    expect(plan.fileText).toContain(plan.inviteUrl)
    expect(collageInviteText(headline)).toContain("Make your own")
    expect(collageInviteUrl("https://playlisttimemachine.com/p/abc?collage=1")).toBe(
      "https://playlisttimemachine.com/p/abc?collage=1",
    )
    expect(collageDownloadName("Class of 1984", "square")).toBe("class-of-1984-square.png")
    expect(collageDownloadName("Class of 1984", "wallpaper")).toBe("class-of-1984-wallpaper.png")
    expect(
      collageDescription({
        headline,
        count: 255,
        format: "wallpaper",
        layout: "mosaic",
        heroCount: 11,
      }),
    ).toContain("Free to download")
  })
})
