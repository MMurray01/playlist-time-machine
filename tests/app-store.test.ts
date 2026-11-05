import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { APP_STORE_ID, APP_STORE_URL } from "@/lib/site/app-store"

const LISTING = "https://apps.apple.com/us/app/playlist-time-machine/id6823308079"

const SURFACES = [
  "components/time-machine.tsx",
  "components/site-footer.tsx",
  "components/share-sheet.tsx",
  "components/make-yours.tsx",
  "components/cover-collage.tsx",
  "app/layout.tsx",
]

describe("App Store listing", () => {
  it("uses the live Playlist Time Machine listing", () => {
    expect(APP_STORE_ID).toBe("6823308079")
    expect(APP_STORE_URL).toBe(LISTING)
    expect(APP_STORE_URL).toContain(`/id${APP_STORE_ID}`)
  })

  it("places that listing on the hero, footer, share paths, and the smart banner", () => {
    const link = readFileSync("components/app-store-link.tsx", "utf8")
    expect(link).toContain("APP_STORE_URL")
    expect(link).toContain('alt="Download on the App Store"')
    expect(link).toContain("Get the app")
    expect(link).not.toContain("apps.apple.com")

    for (const file of SURFACES) {
      const source = readFileSync(file, "utf8")
      expect(source, file).toMatch(/AppStoreBadge|GetTheAppLink|APP_STORE_ID/)
      expect(source, file).not.toContain("apps.apple.com")
    }

    expect(readFileSync("app/layout.tsx", "utf8")).toContain("itunes: { appId: APP_STORE_ID }")
    const badge = readFileSync("public/badges/download-on-the-app-store.svg", "utf8")
    expect(badge).toContain("Download_on_the_App_Store_Badge_US-UK_RGB_blk_4SVG_092917")
  })

  it("keeps website sharing beside the App Store link", () => {
    const sheet = readFileSync("components/share-sheet.tsx", "utf8")
    expect(sheet).toContain("Copy link")
    expect(sheet).toContain('channelHref("facebook")')
    expect(sheet).toContain("<GetTheAppLink />")
    expect(sheet.indexOf("Copy link")).toBeLessThan(sheet.indexOf("<GetTheAppLink />"))
  })
})
