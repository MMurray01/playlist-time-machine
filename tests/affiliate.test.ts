import { describe, expect, it } from "vitest"
import { activeAffiliateToken, appleLinkRel, withAppleAffiliate } from "@/lib/affiliate"

describe("Apple affiliate links", () => {
  it("leaves music links unchanged when no token is set", () => {
    const url = "https://music.apple.com/us/song/every-breath-you-take/1"
    expect(withAppleAffiliate(url, "preview-badge", null)).toBe(url)
    expect(withAppleAffiliate(url, "preview-badge", "  ")).toBe(url)
    expect(appleLinkRel(null)).toBe("noopener noreferrer")
    expect(activeAffiliateToken(undefined)).toBeNull()
  })

  it("appends at, ct, app, and ls on music.apple.com links", () => {
    const href = withAppleAffiliate(
      "https://music.apple.com/us/subscribe",
      "from-spotify",
      " 1000lTOKEN ",
    )
    const parsed = new URL(href)
    expect(parsed.searchParams.get("app")).toBe("music")
    expect(parsed.searchParams.get("at")).toBe("1000lTOKEN")
    expect(parsed.searchParams.get("ct")).toBe("from-spotify")
    expect(parsed.searchParams.get("ls")).toBe("1")
    expect(parsed.searchParams.getAll("at")).toHaveLength(1)
    expect(appleLinkRel("1000lTOKEN")).toBe("nofollow noopener noreferrer")
  })

  it("uses the placement as the campaign name", () => {
    for (const placement of ["save-flow", "preview-badge", "from-spotify", "share-page"] as const) {
      const href = withAppleAffiliate("https://geo.music.apple.com/us/album/x/1", placement, "tok")
      expect(new URL(href).searchParams.get("ct")).toBe(placement)
    }
  })

  it("does not rewrite links outside Apple Music", () => {
    const support = "https://support.apple.com/en-us/118249"
    expect(withAppleAffiliate(support, "from-spotify", "tok")).toBe(support)
    expect(withAppleAffiliate("/p/abc", "share-page", "tok")).toBe("/p/abc")
  })

  it("rejects a token that would break the query string", () => {
    const url = "https://music.apple.com/us/song/rise/9"
    expect(withAppleAffiliate(url, "save-flow", "tok&at=other")).toBe(url)
    expect(activeAffiliateToken("tok&at=other")).toBeNull()
  })
})
