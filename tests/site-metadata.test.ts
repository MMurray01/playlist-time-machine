import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { HOME_DESCRIPTION, SITE_URL, pageUrl, siteMetadata } from "@/lib/site/metadata"

describe("site share metadata", () => {
  it("points the homepage card at the production origin", () => {
    const meta = siteMetadata({
      title: "Playlist Time Machine",
      description: HOME_DESCRIPTION,
      path: "/",
    })
    expect(meta.openGraph).toMatchObject({
      title: "Playlist Time Machine",
      description: HOME_DESCRIPTION,
      url: "https://www.playlisttimemachine.com",
      siteName: "Playlist Time Machine",
      type: "website",
    })
    expect(meta.openGraph && "images" in meta.openGraph ? meta.openGraph.images : []).toEqual([
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Playlist Time Machine. Your graduation year, in number one hits.",
      },
    ])
    expect(meta.twitter).toMatchObject({
      card: "summary_large_image",
      title: "Playlist Time Machine",
      images: ["/og.png"],
    })
  })

  it("gives each static page its own address", () => {
    expect(pageUrl("/")).toBe(SITE_URL)
    expect(pageUrl("/how-it-works")).toBe(`${SITE_URL}/how-it-works`)
    expect(pageUrl("/privacy")).toBe(`${SITE_URL}/privacy`)
    expect(pageUrl("/terms")).toBe(`${SITE_URL}/terms`)
    expect(pageUrl("/from-spotify")).toBe(`${SITE_URL}/from-spotify`)
  })

  it("describes the homepage without a chart brand or a dash", () => {
    expect(HOME_DESCRIPTION).toContain("Your graduation year, in number one hits.")
    expect(HOME_DESCRIPTION.toLowerCase()).not.toContain("billboard")
    expect(HOME_DESCRIPTION).not.toContain("\u2014")
    expect(HOME_DESCRIPTION).not.toContain("\u2013")
  })
})

describe("launch icons", () => {
  it("ships a multi-size favicon, a png icon, and a 180px apple touch icon", () => {
    const ico = readFileSync("app/favicon.ico")
    expect(ico.readUInt16LE(4)).toBeGreaterThanOrEqual(3)
    expect(ico.length).toBeGreaterThan(104)
    expect(readFileSync("app/icon.png").readUInt32BE(16)).toBe(512)
    expect(readFileSync("app/apple-icon.png").readUInt32BE(16)).toBe(180)
    const og = readFileSync("public/og.png")
    expect(og.readUInt32BE(16)).toBe(1200)
    expect(og.readUInt32BE(20)).toBe(630)
    expect(og.length).toBeLessThan(1_000_000)
  })
})
