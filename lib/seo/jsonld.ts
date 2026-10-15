import type { BuiltPlaylist, ChartHit } from "@/lib/playlist/types"

export function jsonLdMarkup(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c")
}
import { canonicalUrl } from "@/lib/seo/pages"
import { HOME_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site/metadata"

export function homeJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: SITE_NAME,
        url: SITE_URL,
        description: HOME_DESCRIPTION,
      },
      {
        "@type": "Organization",
        name: SITE_NAME,
        url: SITE_URL,
        description: HOME_DESCRIPTION,
        logo: `${SITE_URL}/icon.png`,
      },
    ],
  }
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: canonicalUrl(item.path),
    })),
  }
}

export function classPlaylistJsonLd(playlist: BuiltPlaylist, path: string, name = playlist.title) {
  return {
    "@context": "https://schema.org",
    "@type": "MusicPlaylist",
    name,
    description: `Number one hits from ${playlist.startYear} to ${playlist.endYear}.`,
    url: canonicalUrl(path),
    numTracks: playlist.hits.length,
    track: playlist.hits.map((hit, index) => recording(hit, index + 1)),
  }
}

export function linkListJsonLd(name: string, path: string, items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    url: canonicalUrl(path),
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: canonicalUrl(item.path),
    })),
  }
}

export function yearListJsonLd(year: number, hits: ChartHit[], path: string) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Number one hits of ${year}`,
    url: canonicalUrl(path),
    numberOfItems: hits.length,
    itemListElement: hits.map((hit, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: recording(hit, index + 1),
    })),
  }
}

function recording(hit: ChartHit, position: number) {
  return {
    "@type": "MusicRecording",
    position,
    name: hit.title,
    byArtist: {
      "@type": "MusicGroup",
      name: hit.artist,
    },
  }
}
