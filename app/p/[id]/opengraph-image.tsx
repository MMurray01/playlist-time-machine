import { ImageResponse } from "next/og"
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
          background: "#f3eee4",
          color: "#1c1714",
          padding: "72px",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, letterSpacing: 4, color: "#6e1e34", fontWeight: 700 }}>
          PLAYLIST TIME MACHINE
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 84, lineHeight: 1, fontWeight: 650 }}>{title}</div>
          <div style={{ display: "flex", marginTop: 24, fontSize: 32, color: "#3f3832" }}>{detail}</div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 28, fontSize: 28, color: "#3f3832" }}>
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
