import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { SITE_URL, pageUrl, siteMetadata } from "@/lib/site/metadata"

describe("site share metadata", () => {
  it("points the homepage card at the production origin", () => {
    const meta = siteMetadata({
      title: "Playlist Time Machine",
      description: "The gift of music rediscovery",
      path: "/",
    })
    expect(meta.openGraph).toMatchObject({
      title: "Playlist Time Machine",
      description: "The gift of music rediscovery",
      url: "https://www.playlisttimemachine.com",
      siteName: "Playlist Time Machine",
      type: "website",
    })
    expect(meta.openGraph && "images" in meta.openGraph ? meta.openGraph.images : []).toEqual([
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Playlist Time Machine. The gift of music rediscovery",
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
  })
})
