import { describe, expect, it } from "vitest"
import {
  APPLE_COVER_TIP,
  APPLE_LIBRARY_DESCRIPTION_MAX,
  appleLibraryPlaylistDescription,
  appleLibraryPlaylistName,
  libraryCoverFilename,
  libraryCoverPlan,
} from "@/lib/playlist/apple-library"

describe("Apple Music library branding", () => {
  it("names a saved class playlist with the site", () => {
    expect(appleLibraryPlaylistName(1980)).toBe("Class of 1980 \u00b7 Playlist Time Machine")
    expect(appleLibraryPlaylistName(1980).length).toBeLessThanOrEqual(80)
  })

  it("keeps the year-range sentence and ends with the site, then a share URL when it fits", () => {
    const base = appleLibraryPlaylistDescription(1975, 1985)
    expect(base).toBe(
      "Number one hits from 1975 through 1985, the popular songs of the time. Made at playlisttimemachine.com",
    )
    const share = "https://www.playlisttimemachine.com/p/hvNkUNU7FX"
    const withShare = appleLibraryPlaylistDescription(1975, 1985, share)
    expect(withShare).toBe(`${base} ${share}`)
    expect(withShare.length).toBeLessThanOrEqual(APPLE_LIBRARY_DESCRIPTION_MAX)
    expect(withShare.endsWith(share)).toBe(true)
  })

  it("drops a share URL that would pass the description cap", () => {
    const huge = `https://www.playlisttimemachine.com/${"a".repeat(400)}`
    const text = appleLibraryPlaylistDescription(1975, 1985, huge)
    expect(text.endsWith("Made at playlisttimemachine.com")).toBe(true)
    expect(text.length).toBeLessThanOrEqual(APPLE_LIBRARY_DESCRIPTION_MAX)
  })

  it("builds a 1080 square cover titled with the class year", () => {
    const plan = libraryCoverPlan({
      graduationYear: 1980,
      startYear: 1975,
      endYear: 1985,
      hits: [
        { key: "a", year: 1975, weeks: 2 },
        { key: "b", year: 1980, weeks: 5 },
      ],
    })
    expect(plan.width).toBe(1080)
    expect(plan.height).toBe(1080)
    expect(plan.headline).toBe("Class of 1980")
    expect(plan.mark).toBe("Playlist Time Machine")
    expect(plan.tiles.length).toBe(2)
    expect(libraryCoverFilename(1980)).toBe("class-of-1980-cover.png")
    expect(APPLE_COVER_TIP).toContain("tap \u2026, tap Edit")
  })
})
