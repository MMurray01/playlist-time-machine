import { describe, expect, it } from "vitest"
import {
  INSTAGRAM_TIP,
  TIKTOK_TIP,
  canonicalShareUrl,
  emailShareUrl,
  facebookShareUrl,
  isAppleUserAgent,
  shareMessage,
  shareSubject,
  smsShareUrl,
  storyFilename,
  whatsAppShareUrl,
  withShareUtm,
  xShareUrl,
} from "@/lib/share/channels"
import { pickStoryHits } from "@/lib/share/story"

const PAGE = "https://www.playlisttimemachine.com/p/hvNkUNU7FX?collage=1#year-1984"
const HOME = "https://www.playlisttimemachine.com/"

function expectCleanCopy(value: string) {
  expect(value).not.toContain("\u2014")
  expect(value.toLowerCase()).not.toContain("billboard")
}

describe("share copy and channel links", () => {
  it("writes the playlist and site messages with a channel link", () => {
    const playlistUrl = withShareUtm(PAGE, "whatsapp")
    const playlist = shareMessage("playlist", playlistUrl, 1984)
    expect(playlist).toBe(
      `My Class of 1984 playlist: the number one hits from the years that shaped me. Find yours: ${playlistUrl}`,
    )
    const siteUrl = withShareUtm(HOME, "native")
    const site = shareMessage("site", siteUrl)
    expect(site).toBe(
      `A gift of music rediscovery. Enter your graduation year and get the number one hits from the years that shaped you: ${siteUrl}`,
    )
    expectCleanCopy(playlist)
    expectCleanCopy(site)
    expectCleanCopy(INSTAGRAM_TIP)
    expectCleanCopy(TIKTOK_TIP)
    expectCleanCopy(shareSubject("playlist", 1984))
    expect(shareSubject("site")).toBe("A gift of music rediscovery")
  })

  it("adds utm_source and utm_medium without keeping collage or old campaign params", () => {
    const url = new URL(withShareUtm(`${PAGE}&utm_source=old&utm_medium=email`, "facebook"))
    expect(url.searchParams.get("utm_source")).toBe("facebook")
    expect(url.searchParams.get("utm_medium")).toBe("share")
    expect(url.searchParams.get("collage")).toBeNull()
    expect(url.hash).toBe("")
    expect(canonicalShareUrl(PAGE)).toBe("https://www.playlisttimemachine.com/p/hvNkUNU7FX")
  })

  it("builds the standard share destinations", () => {
    const url = withShareUtm(HOME, "facebook")
    const text = shareMessage("site", url)
    expect(facebookShareUrl(url)).toBe(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`)
    expect(xShareUrl(text)).toBe(`https://x.com/intent/post?text=${encodeURIComponent(text)}`)
    expect(whatsAppShareUrl(text)).toBe(`https://wa.me/?text=${encodeURIComponent(text)}`)
    expect(smsShareUrl(text)).toBe(`sms:?&body=${encodeURIComponent(text)}`)
    const mail = emailShareUrl(shareSubject("site"), text)
    expect(mail.startsWith("mailto:?subject=")).toBe(true)
    expect(mail).toContain(`body=${encodeURIComponent(text)}`)
  })

  it("treats Apple devices as iMessage and names the story file", () => {
    expect(isAppleUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")).toBe(true)
    expect(isAppleUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)")).toBe(true)
    expect(isAppleUserAgent("Mozilla/5.0 (Windows NT 10.0)")).toBe(false)
    expect(storyFilename("playlist", 1984)).toBe("class-of-1984-story.png")
    expect(storyFilename("site")).toBe("playlist-time-machine-story.png")
  })

  it("picks story covers from every year instead of the first songs only", () => {
    const hits = []
    for (let year = 1979; year <= 1989; year += 1) {
      for (let index = 0; index < 8; index += 1) hits.push({ year, index })
    }
    const picked = pickStoryHits(hits, (hit) => hit.year, 20)
    expect(picked).toHaveLength(20)
    expect(new Set(picked.map((hit) => hit.year)).size).toBe(11)
    expect(picked[0]).toEqual({ year: 1979, index: 0 })
    expect(picked.some((hit) => hit.year === 1989)).toBe(true)
  })
})
