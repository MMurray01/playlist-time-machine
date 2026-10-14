import type { Metadata } from "next"
import Link from "next/link"
import { headers } from "next/headers"
import { notFound } from "next/navigation"
import { PlaylistDocument } from "@/components/playlist-document"
import { getProviderAvailability } from "@/lib/server/env"
import { getSharedPlaylistPage } from "@/lib/server/share"

async function requestOrigin(): Promise<string> {
  const headerList = await headers()
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host")
  if (!host) return ""
  const proto = headerList.get("x-forwarded-proto") ?? "https"
  return `${proto}://${host}`
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const page = await getSharedPlaylistPage(id)
  if (!page.ok) {
    return { title: "Playlist not found · Playlist Time Machine" }
  }
  const origin = await requestOrigin()
  const canonical = origin ? `${origin}/p/${id}` : `/p/${id}`
  const title = `${page.playlist.title} · Playlist Time Machine`
  const description = `Every Billboard Hot 100 No. 1 from ${page.playlist.startYear} through ${page.playlist.endYear}. ${page.playlist.hits.length} songs, in chart order.`
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: "website",
      url: canonical,
      images: [origin ? `${origin}/p/${id}/opengraph-image` : `/p/${id}/opengraph-image`],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  }
}

export default async function SharedPlaylistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const page = await getSharedPlaylistPage(id)
  if (!page.ok && page.reason === "not_found") notFound()
  if (!page.ok) {
    return (
      <main className="sheet px-1 py-16 sm:py-24">
        <h1>The chart library could not be read.</h1>
        <p className="lede">Try this link again in a moment.</p>
      </main>
    )
  }

  return (
    <main className="sheet px-1 py-16 sm:py-24">
      <p className="wordmark">
        <Link href="/">Playlist Time Machine</Link>
      </p>
      <PlaylistDocument playlist={page.playlist} providers={getProviderAvailability()} mode="shared" />
    </main>
  )
}
