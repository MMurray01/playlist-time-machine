import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { HitList } from "@/components/hit-list"
import { JsonLd } from "@/components/json-ld"
import { TrackLink } from "@/components/track-link"
import type { BuiltPlaylist } from "@/lib/playlist/types"
import { graduationWindow } from "@/lib/playlist/window"
import { seoCatalog } from "@/lib/seo/catalog"
import { breadcrumbJsonLd, classPlaylistJsonLd } from "@/lib/seo/jsonld"
import {
  classImageAlt,
  classIntro,
  classSongDescription,
  classSongTitle,
  playlistCtaHref,
} from "@/lib/seo/pages"
import { loadBuiltPlaylist } from "@/lib/server/chart"
import { pageSocialMetadata } from "@/lib/site/metadata"

export const dynamicParams = false
export const revalidate = 86400

const playlists = new Map<number, Promise<BuiltPlaylist>>()

function classPlaylist(year: number): Promise<BuiltPlaylist> {
  const existing = playlists.get(year)
  if (existing) return existing
  const pending = loadBuiltPlaylist({ graduationYear: year, genres: [] }).then((result) => {
    if (!result.ok) throw new Error(result.error)
    return result.playlist
  })
  playlists.set(year, pending)
  return pending
}

export async function generateStaticParams() {
  const { classYears } = await seoCatalog()
  return classYears.map((year) => ({ year: String(year) }))
}

export async function generateMetadata({ params }: { params: Promise<{ year: string }> }): Promise<Metadata> {
  const year = Number((await params).year)
  if (!Number.isInteger(year)) return {}
  const catalog = await seoCatalog()
  if (!catalog.classYears.includes(year)) return {}
  const window = graduationWindow(year)
  const playlist = await classPlaylist(year)
  const title = classSongTitle(year, window.startYear, window.endYear)
  const description = classSongDescription(year, window.startYear, window.endYear, playlist.hits.length)
  return pageSocialMetadata({
    title,
    description,
    path: `/class-of/${year}`,
    imagePath: `/class-of/${year}/opengraph-image`,
    imageAlt: classImageAlt(year, window.startYear, window.endYear),
  })
}

export default async function ClassOfPage({ params }: { params: Promise<{ year: string }> }) {
  const raw = (await params).year
  const year = Number(raw)
  if (!/^\d{4}$/.test(raw) || !Number.isInteger(year)) notFound()

  const catalog = await seoCatalog()
  const index = catalog.classYears.indexOf(year)
  if (index < 0) notFound()

  const playlist = await classPlaylist(year)
  const window = graduationWindow(year)
  const title = classSongTitle(year, window.startYear, window.endYear)
  const previous = catalog.classYears[index - 1]
  const next = catalog.classYears[index + 1]
  const decade = Math.floor(year / 10) * 10
  const decadePath = catalog.decades.includes(decade) ? `/number-one-hits/${decade}s` : null
  const path = `/class-of/${year}`

  return (
    <main className="sheet crawl-page px-1 py-16 sm:py-24">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Playlist Time Machine", path: "/" },
          { name: `Class of ${year}`, path },
        ])}
      />
      <JsonLd data={classPlaylistJsonLd(playlist, path, title)} />
      <p className="wordmark">
        <Link href="/">Playlist Time Machine</Link>
      </p>
      <p className="kicker">Graduation year</p>
      <h1>{`Class of ${year} songs`}</h1>
      <p className="lede">{classIntro(year, window.startYear, window.endYear)}</p>
      <p className="quiet crawl-count">
        {playlist.hits.length === 1 ? "1 song" : `${playlist.hits.length} songs`}, listed in the order they reached
        the top.
      </p>
      <TrackLink
        href={playlistCtaHref(year, "class-of")}
        className="btn btn-accent btn-block"
        event="make_your_own_click"
        params={{ location: "class-of", year }}
      >
        Make my playlist
      </TrackLink>

      {playlist.years.map((chapter) => (
        <section key={chapter.year} className="hit-year" aria-labelledby={`year-${chapter.year}`}>
          <h2 id={`year-${chapter.year}`}>
            <Link href={`/number-one-hits/${chapter.year}`}>{chapter.year}</Link>
          </h2>
          <p className="hit-story">{chapter.story.summary}</p>
          {chapter.story.editorial ? <p className="hit-story">{chapter.story.editorial}</p> : null}
          <HitList hits={chapter.hits} />
        </section>
      ))}

      <TrackLink
        href={playlistCtaHref(year, "class-of")}
        className="btn btn-accent btn-block"
        event="make_your_own_click"
        params={{ location: "class-of", year }}
      >
        Make my playlist
      </TrackLink>
      <nav className="year-nav" aria-label="Nearby classes">
        {previous != null ? <Link href={`/class-of/${previous}`}>Class of {previous}</Link> : null}
        {next != null ? <Link href={`/class-of/${next}`}>Class of {next}</Link> : null}
        {decadePath ? <Link href={decadePath}>Number one hits of the {decade}s</Link> : null}
      </nav>
    </main>
  )
}
