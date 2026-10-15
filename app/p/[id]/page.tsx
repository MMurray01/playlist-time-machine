import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { MakeYours } from "@/components/make-yours"
import { PlaylistDocument } from "@/components/playlist-document"
import { graduationYearLimits } from "@/lib/playlist/window"
import { getChartYearSpan } from "@/lib/server/chart"
import { getAffiliateToken, getProviderAvailability } from "@/lib/server/env"
import { getSharedPlaylistPage } from "@/lib/server/share"
import { pageUrl } from "@/lib/site/metadata"

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
    return {
      title: "Playlist not found · Playlist Time Machine",
      robots: { index: false, follow: false },
    }
  }
  const canonical = pageUrl(`/p/${id}`)
  const collage = query.collage === "1"
  const title = collage
    ? `Make a cover collage · ${page.playlist.title}`
    : `${page.playlist.title} · Playlist Time Machine`
  const description = collage
    ? `A free collage of album covers from ${page.playlist.title}, ${page.playlist.startYear} through ${page.playlist.endYear}. Make your own with Playlist Time Machine.`
    : `Number one hits from ${page.playlist.startYear} through ${page.playlist.endYear}, the popular songs of the time. ${page.playlist.hits.length} songs, in the order they reached the top.`
  const imageUrl = `${canonical}/opengraph-image`
  const imageAlt = `${page.playlist.title}. Number one hits from ${page.playlist.startYear} through ${page.playlist.endYear}.`
  return {
    title,
    description,
    robots: { index: false, follow: true },
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: "website",
      url: canonical,
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
  const [page, span] = await Promise.all([getSharedPlaylistPage(id), getChartYearSpan()])
  if (!page.ok && page.reason === "not_found") notFound()
  if (!page.ok) {
    return (
      <main className="sheet px-1 py-16 sm:py-24">
        <h1>The chart library could not be read.</h1>
        <p className="lede">Try this link again in a moment.</p>
      </main>
    )
  }

  const limits = graduationYearLimits({ chartMinYear: span.minYear, chartMaxYear: span.maxYear })

  return (
    <main className="sheet share-received px-1 py-16 sm:py-24">
      <p className="wordmark">
        <Link href="/">Playlist Time Machine</Link>
      </p>
      <MakeYours sharedYear={page.playlist.graduationYear} limits={limits} libraryError={span.error}>
        <PlaylistDocument
          playlist={page.playlist}
          providers={getProviderAvailability()}
          mode="shared"
          affiliateToken={getAffiliateToken()}
          openCollage={query.collage === "1"}
        />
      </MakeYours>
    </main>
  )
}
