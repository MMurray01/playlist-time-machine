import { ImageResponse } from "next/og"
import { chooseCatalogMatch } from "@/lib/playlist/match"
import { tokens } from "@/lib/playlist/tokens"
import type { ChartHit } from "@/lib/playlist/types"
import { createCatalogSearcher } from "@/lib/providers/catalog-search"
import { readAppleMusicCredentials, signAppleDeveloperToken } from "@/lib/providers/apple-token"
import { getSharedPlaylistPage } from "@/lib/server/share"

export const alt = "Playlist Time Machine"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

async function topCovers(hits: ChartHit[]): Promise<string[]> {
  const credentials = readAppleMusicCredentials()
  let developerToken: string | null = null
  if (credentials) {
    try {
      developerToken = await signAppleDeveloperToken(credentials)
    } catch {
      developerToken = null
    }
  }
  const search = createCatalogSearcher(fetch, { developerToken })
  const found = await Promise.all(
    hits.slice(0, 3).map(async (hit) => {
      try {
        const rows = await search({ title: hit.title, artist: hit.artist })
        return chooseCatalogMatch({ title: hit.title, artist: hit.artist }, rows)?.artworkUrl ?? null
      } catch {
        return null
      }
    }),
  )
  return found.filter((url): url is string => Boolean(url))
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const page = await getSharedPlaylistPage(id)
  const title = page.ok ? page.playlist.title : "Playlist Time Machine"
  const detail = page.ok
    ? `${page.playlist.hits.length} No. 1 hits · ${page.playlist.startYear}–${page.playlist.endYear}`
    : "Number one hits"
  const covers = page.ok ? await topCovers(page.playlist.hits) : []

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: tokens.paper,
          color: tokens.ink,
          padding: "72px",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, color: tokens.accent, fontWeight: 600 }}>Playlist Time Machine</div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 48 }}>
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 680 }}>
            <div style={{ display: "flex", fontSize: 68, lineHeight: 1.05, fontWeight: 600, letterSpacing: -2 }}>
              {title}
            </div>
            <div style={{ display: "flex", marginTop: 24, fontSize: 30, color: tokens.inkSoft }}>{detail}</div>
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            {covers.map((src) => (
              // Satori renders this remote catalog image into the share card.
              // eslint-disable-next-line @next/next/no-img-element
              <img key={src} src={src} alt="" width={168} height={168} style={{ borderRadius: 12 }} />
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
