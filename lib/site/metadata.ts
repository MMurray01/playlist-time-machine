import type { Metadata } from "next"

export const SITE_URL = "https://www.playlisttimemachine.com"
export const SITE_NAME = "Playlist Time Machine"

export const HOME_DESCRIPTION =
  "Your graduation year, in number one hits. Enter your high school graduation year and get the number one hits from the eleven years that shaped you."

const SHARE_IMAGE = {
  url: "/og.png",
  width: 1200,
  height: 630,
  alt: "Playlist Time Machine. Your graduation year, in number one hits.",
} as const

export function pageUrl(path: string): string {
  if (path === "/" || path === "") return SITE_URL
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`
}

/** Open Graph and Twitter card for a static page. The image is the shared brand card. */
export function siteMetadata({
  title,
  description,
  path,
}: {
  title: string
  description: string
  path: string
}): Metadata {
  const url = pageUrl(path)
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type: "website",
      images: [SHARE_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [SHARE_IMAGE.url],
    },
  }
}
