import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { PlaylistDocument } from "@/components/playlist-document"
import { getProviderAvailability } from "@/lib/server/env"
import { getSharedPlaylistPage } from "@/lib/server/share"

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const page = await getSharedPlaylistPage(id)
  if (!page.ok) {
    return { title: "Playlist not found · Playlist Time Machine" }
  }
  const title = `${page.playlist.title} · Playlist Time Machine`
  const description = `Every Billboard Hot 100 No. 1 from ${page.playlist.startYear} through ${page.playlist.endYear}. ${page.playlist.hits.length} songs, in chart order.`
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
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
