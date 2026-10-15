import { ImageResponse } from "next/og"
import { SeoCard } from "@/lib/seo/og-card"
import { parseHitsSlug } from "@/lib/seo/pages"

export const alt = "Number one hits"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const parsed = parseHitsSlug((await params).slug)
  const title =
    parsed?.kind === "year"
      ? `Number one hits of ${parsed.year}`
      : parsed?.kind === "decade"
        ? `Number one hits of the ${parsed.decadeStart}s`
        : "Number one hits"
  const detail =
    parsed?.kind === "year"
      ? `The songs that reached number one in ${parsed.year}.`
      : parsed?.kind === "decade"
        ? `Chart years from ${parsed.decadeStart} to ${parsed.decadeStart + 9}.`
        : "The songs that reached number one."

  return new ImageResponse(
    <SeoCard kicker="Playlist Time Machine" title={title} detail={detail} />,
    { ...size },
  )
}
