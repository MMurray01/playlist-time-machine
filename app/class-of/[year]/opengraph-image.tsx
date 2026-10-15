import { ImageResponse } from "next/og"
import { SeoCard } from "@/lib/seo/og-card"
import { graduationWindow } from "@/lib/playlist/window"

export const alt = "Class songs, the number one hits from the years around graduation"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function Image({ params }: { params: Promise<{ year: string }> }) {
  const year = Number((await params).year)
  const window = Number.isInteger(year) ? graduationWindow(year) : null
  const title = window ? `Class of ${year} songs` : "Class songs"
  const detail = window
    ? `The number one hits from ${window.startYear} to ${window.endYear}.`
    : "Number one hits from the years around graduation."

  return new ImageResponse(
    <SeoCard kicker="Playlist Time Machine" title={title} detail={detail} />,
    { ...size },
  )
}
