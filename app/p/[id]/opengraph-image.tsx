import { ImageResponse } from "next/og"
import catalogFile from "@/data/catalog-matches.json"
import { partitionStaticTracks, type StaticCatalogFile } from "@/lib/playlist/catalog-static"
import { hitKey } from "@/lib/playlist/hits"
import { pickStoryHits } from "@/lib/share/story"
import type { ChartHit } from "@/lib/playlist/types"
import { getSharedPlaylistPage } from "@/lib/server/share"

export const alt = "A class playlist of number one hits"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

function coverUrls(hits: ChartHit[]): string[] {
  const picks = pickStoryHits(hits, (hit) => hit.year, 8)
  const tracks = picks.flatMap((hit) =>
    hit.songId == null ? [] : [{ key: hitKey(hit), title: hit.title, artist: hit.artist }],
  )
  const found = partitionStaticTracks(tracks, (catalogFile as StaticCatalogFile).songs)
  return found.matches.flatMap((match) => {
    const art = match.artworkLargeUrl || match.artworkUrl
    return art ? [art.replace(/\/\d+x\d+/, "/360x360")] : []
  })
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const page = await getSharedPlaylistPage(id)
  const title = page.ok ? page.playlist.title : "Playlist Time Machine"
  const detail = page.ok
    ? `${page.playlist.hits.length} number one hits, ${page.playlist.startYear} through ${page.playlist.endYear}`
    : "Number one hits from the years that shaped you"
  const covers = page.ok ? coverUrls(page.playlist.hits).slice(0, 8) : []

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#100c16",
          color: "#fffdf8",
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            width: 520,
            marginLeft: "auto",
            alignContent: "center",
            gap: 12,
            padding: 28,
          }}
        >
          {covers.map((src) => (
            // Satori paints these catalog covers into the share card.
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={src} alt="" width={168} height={168} style={{ borderRadius: 12, objectFit: "cover" }} />
          ))}
        </div>
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            background: "linear-gradient(90deg, rgba(8,5,16,0.94) 0%, rgba(8,5,16,0.82) 42%, rgba(8,5,16,0.28) 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            bottom: 0,
            width: 760,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "64px 72px",
          }}
        >
          <div style={{ display: "flex", fontSize: 28, fontWeight: 600, color: "#d6d3d1" }}>Playlist Time Machine</div>
          <div
            style={{
              display: "flex",
              marginTop: 28,
              fontSize: 68,
              lineHeight: 1.02,
              fontWeight: 700,
              letterSpacing: -2,
            }}
          >
            {title}
          </div>
          <div style={{ display: "flex", marginTop: 22, fontSize: 30, lineHeight: 1.35, color: "#f4f1ea" }}>{detail}</div>
        </div>
      </div>
    ),
    { ...size },
  )
}
