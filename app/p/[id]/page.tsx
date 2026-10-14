import type { Metadata } from "next"
import Link from "next/link"
import { headers } from "next/headers"
import { notFound } from "next/navigation"
import { PlaylistDocument } from "@/components/playlist-document"
import { getAffiliateToken, getProviderAvailability } from "@/lib/server/env"
import { getSharedPlaylistPage } from "@/lib/server/share"

async function requestOrigin(): Promise<string> {
  const headerList = await headers()
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host")
  if (!host) return ""
  const proto = headerList.get("x-forwarded-proto") ?? "https"
  return `${proto}://${host}`
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ collage?: string }>
}): Promise<Metadata> {
  const { id } = await params
  const query = await searchParams
  const page = await getSharedPlaylistPage(id)
  if (!page.ok) {
    return { title: "Playlist not found · Playlist Time Machine" }
  }
  const origin = await requestOrigin()
  const canonical = origin ? `${origin}/p/${id}` : `/p/${id}`
  const collage = query.collage === "1"
  const invite = origin ? `${canonical}?collage=1` : `/p/${id}?collage=1`
  const title = collage
    ? `Make a cover collage · ${page.playlist.title}`
    : `${page.playlist.title} · Playlist Time Machine`
  const description = collage
    ? `A free collage of album covers from ${page.playlist.title}, ${page.playlist.startYear} through ${page.playlist.endYear}. Make your own with Playlist Time Machine.`
    : `Number one hits from ${page.playlist.startYear} through ${page.playlist.endYear}, the popular songs of the time. ${page.playlist.hits.length} songs, in the order they reached the top.`
  const imageUrl = origin ? `${origin}/p/${id}/opengraph-image` : `/p/${id}/opengraph-image`
  const imageAlt = `${page.playlist.title}. Number one hits from ${page.playlist.startYear} through ${page.playlist.endYear}.`
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: "website",
      url: collage ? invite : canonical,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: imageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  }
}

export default async function SharedPlaylistPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ collage?: string }>
}) {
  const { id } = await params
  const query = await searchParams
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
      <PlaylistDocument
        playlist={page.playlist}
        providers={getProviderAvailability()}
        mode="shared"
        affiliateToken={getAffiliateToken()}
        openCollage={query.collage === "1"}
      />
    </main>
  )
}
