import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { HitList } from "@/components/hit-list"
import { JsonLd } from "@/components/json-ld"
import { TrackLink } from "@/components/track-link"
import { dedupeHits } from "@/lib/playlist/hits"
import { deriveYearStory } from "@/lib/playlist/stories"
import type { ChartHit } from "@/lib/playlist/types"
import { seoCatalog, type SeoCatalog } from "@/lib/seo/catalog"
import { breadcrumbJsonLd, linkListJsonLd, yearListJsonLd } from "@/lib/seo/jsonld"
import {
  chartYearDescription,
  chartYearImageAlt,
  chartYearTitle,
  classYearForChart,
  classYearInDecade,
  classesCoveringYear,
  decadeDescription,
  decadeImageAlt,
  decadeTitle,
  parseHitsSlug,
  playlistCtaHref,
} from "@/lib/seo/pages"
import { loadChartYear } from "@/lib/server/chart"
import { pageSocialMetadata } from "@/lib/site/metadata"

export const dynamicParams = false
export const revalidate = 86400

const yearCache = new Map<number, Promise<ChartHit[]>>()

function chartHits(year: number): Promise<ChartHit[]> {
  const existing = yearCache.get(year)
  if (existing) return existing
  const pending = loadChartYear(year).then((result) => {
    if (!result.ok) throw new Error(result.error)
    return dedupeHits(result.hits)
  })
  yearCache.set(year, pending)
  return pending
}

export async function generateStaticParams() {
  const { chartYears, decades } = await seoCatalog()
  return [
    ...chartYears.map((year) => ({ slug: String(year) })),
    ...decades.map((decade) => ({ slug: `${decade}s` })),
  ]
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const parsed = parseHitsSlug((await params).slug)
  if (!parsed) return {}
  const catalog = await seoCatalog()
  if (parsed.kind === "decade") {
    if (!catalog.decades.includes(parsed.decadeStart)) return {}
    const title = decadeTitle(parsed.decadeStart)
    return pageSocialMetadata({
      title,
      description: decadeDescription(parsed.decadeStart),
      path: `/number-one-hits/${parsed.decadeStart}s`,
      imagePath: `/number-one-hits/${parsed.decadeStart}s/opengraph-image`,
      imageAlt: decadeImageAlt(parsed.decadeStart),
    })
  }
  if (!catalog.chartYears.includes(parsed.year)) return {}
  const hits = await chartHits(parsed.year)
  const title = chartYearTitle(parsed.year)
  return pageSocialMetadata({
    title,
    description: chartYearDescription(parsed.year, hits.length),
    path: `/number-one-hits/${parsed.year}`,
    imagePath: `/number-one-hits/${parsed.year}/opengraph-image`,
    imageAlt: chartYearImageAlt(parsed.year),
  })
}

export default async function NumberOneHitsPage({ params }: { params: Promise<{ slug: string }> }) {
  const parsed = parseHitsSlug((await params).slug)
  if (!parsed) notFound()
  const catalog = await seoCatalog()
  if (parsed.kind === "decade") {
    if (!catalog.decades.includes(parsed.decadeStart)) notFound()
    return <DecadePage decadeStart={parsed.decadeStart} catalog={catalog} />
  }
  if (!catalog.chartYears.includes(parsed.year)) notFound()
  const hits = await chartHits(parsed.year)
  return <YearPage year={parsed.year} hits={hits} catalog={catalog} />
}

function YearPage({ year, hits, catalog }: { year: number; hits: ChartHit[]; catalog: SeoCatalog }) {
  const story = deriveYearStory(year, hits)
  const decade = Math.floor(year / 10) * 10
  const decadePath = catalog.decades.includes(decade) ? `/number-one-hits/${decade}s` : null
  const classes = classesCoveringYear(year, catalog.classYears)
  const ctaYear = classYearForChart(year, catalog.classYears)
  const path = `/number-one-hits/${year}`
  const crumbs = [
    { name: "Playlist Time Machine", path: "/" },
    ...(decadePath ? [{ name: `The ${decade}s`, path: decadePath }] : []),
    { name: String(year), path },
  ]

  return (
    <main className="sheet crawl-page px-1 py-16 sm:py-24">
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <JsonLd data={yearListJsonLd(year, hits, path)} />
      <p className="wordmark">
        <Link href="/">Playlist Time Machine</Link>
      </p>
      <p className="kicker">Chart year</p>
      <h1>{chartYearTitle(year)}</h1>
      <p className="lede">{story.summary}</p>
      {story.editorial ? <p className="hit-story">{story.editorial}</p> : null}
      <p className="quiet crawl-count">
        {hits.length === 1 ? "1 song reached" : `${hits.length} songs reached`} number one in {year}.
      </p>
      {ctaYear != null ? (
        <TrackLink
          href={playlistCtaHref(ctaYear, "number-one-hits")}
          className="btn btn-accent btn-block"
          event="make_your_own_click"
          params={{ location: "number-one-hits", year: ctaYear }}
        >
          Make my playlist
        </TrackLink>
      ) : null}
      <HitList hits={hits} />
      <nav className="year-nav" aria-label="Related playlists">
        {decadePath ? <Link href={decadePath}>Number one hits of the {decade}s</Link> : null}
        {classes.map((classYear) => (
          <Link key={classYear} href={`/class-of/${classYear}`}>
            Class of {classYear}
          </Link>
        ))}
      </nav>
    </main>
  )
}

function DecadePage({ decadeStart, catalog }: { decadeStart: number; catalog: SeoCatalog }) {
  const years = catalog.chartYears.filter((year) => year >= decadeStart && year < decadeStart + 10)
  const classes = catalog.classYears.filter((year) => year >= decadeStart && year < decadeStart + 10)
  const ctaYear = classYearInDecade(decadeStart, catalog.classYears) ?? (years[0] != null ? classYearForChart(years[0], catalog.classYears) : null)
  const path = `/number-one-hits/${decadeStart}s`
  const yearLinks = years.map((year) => ({ name: String(year), path: `/number-one-hits/${year}` }))

  return (
    <main className="sheet crawl-page px-1 py-16 sm:py-24">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Playlist Time Machine", path: "/" },
          { name: `The ${decadeStart}s`, path },
        ])}
      />
      <JsonLd data={linkListJsonLd(decadeTitle(decadeStart), path, yearLinks)} />
      <p className="wordmark">
        <Link href="/">Playlist Time Machine</Link>
      </p>
      <p className="kicker">Decade</p>
      <h1>{decadeTitle(decadeStart)}</h1>
      <p className="lede">{decadeDescription(decadeStart)}</p>
      {ctaYear != null ? (
        <TrackLink
          href={playlistCtaHref(ctaYear, "number-one-hits")}
          className="btn btn-accent btn-block"
          event="make_your_own_click"
          params={{ location: "number-one-hits", year: ctaYear }}
        >
          Make my playlist
        </TrackLink>
      ) : null}
      <section className="hit-year" aria-labelledby="decade-years">
        <h2 id="decade-years">Chart years</h2>
        <ul className="hub-list">
          {years.map((year) => (
            <li key={year}>
              <Link href={`/number-one-hits/${year}`}>Number one hits of {year}</Link>
            </li>
          ))}
        </ul>
      </section>
      {classes.length > 0 ? (
        <section className="hit-year" aria-labelledby="decade-classes">
          <h2 id="decade-classes">Class playlists</h2>
          <ul className="hub-list">
            {classes.map((year) => (
              <li key={year}>
                <Link href={`/class-of/${year}`}>Class of {year} songs</Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  )
}
