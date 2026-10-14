import { ImageResponse } from "next/og"
import { tokens } from "@/lib/playlist/tokens"
import { getSharedPlaylistPage } from "@/lib/server/share"

export const alt = "Playlist Time Machine"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const page = await getSharedPlaylistPage(id)
  const title = page.ok ? page.playlist.title : "Playlist Time Machine"
  const detail = page.ok
    ? `${page.playlist.hits.length} No. 1 hits · ${page.playlist.startYear}–${page.playlist.endYear}`
    : "Billboard Hot 100 No. 1s"
  const opening = page.ok
    ? page.playlist.hits.slice(0, 3).map((hit) => `${hit.title} — ${hit.artist}`)
    : []

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
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 76, lineHeight: 1.05, fontWeight: 600, letterSpacing: -2 }}>{title}</div>
          <div style={{ display: "flex", marginTop: 24, fontSize: 30, color: tokens.inkSoft }}>{detail}</div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 28, fontSize: 26, color: tokens.inkSoft }}>
            {opening.map((line) => (
              <div key={line} style={{ display: "flex" }}>
                {line}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
