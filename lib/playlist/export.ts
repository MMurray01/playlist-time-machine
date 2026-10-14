import type { BuiltPlaylist, ChartHit } from "@/lib/playlist/types"

function csvField(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

/** Artist, song, and year. The header is not a song, so data rows equal the playlist length. */
export function playlistCsv(hits: ChartHit[]): string {
  const lines = ["Artist,Song,Year"]
  for (const hit of hits) {
    lines.push([csvField(hit.artist), csvField(hit.title), String(hit.year)].join(","))
  }
  return `${lines.join("\n")}\n`
}

export function playlistText(playlist: BuiltPlaylist): string {
  const count = playlist.hits.length === 1 ? "1 song" : `${playlist.hits.length} songs`
  const lines = [
    playlist.title,
    `${playlist.startYear}–${playlist.endYear}`,
    count,
    "",
    "Artist, Song, Year",
    ...playlist.hits.map((hit) => `${hit.artist}, ${hit.title}, ${hit.year}`),
  ]
  return `${lines.join("\n")}\n`
}

export function downloadFilename(title: string, extension: "csv" | "txt"): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
  return `${base || "playlist"}.${extension}`
}
