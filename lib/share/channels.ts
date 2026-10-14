export const SHARE_SOURCES = [
  "copy",
  "facebook",
  "x",
  "whatsapp",
  "sms",
  "email",
  "imessage",
  "instagram",
  "tiktok",
  "native",
] as const

export type ShareSource = (typeof SHARE_SOURCES)[number]
export type ShareTarget = "site" | "playlist"

export const INSTAGRAM_TIP =
  "Instagram has no web share link. Download the story image, then paste the caption in the app."

export const TIKTOK_TIP =
  "TikTok has no web share link. Download the story image, then paste the caption in the app."

/** Drop a previous campaign and any hash so each channel gets a clean link. */
export function canonicalShareUrl(rawUrl: string): string {
  const url = new URL(rawUrl)
  url.hash = ""
  for (const key of [...url.searchParams.keys()]) {
    if (key === "collage" || key.startsWith("utm_")) url.searchParams.delete(key)
  }
  return url.toString()
}

export function withShareUtm(rawUrl: string, source: ShareSource): string {
  const url = new URL(canonicalShareUrl(rawUrl))
  url.searchParams.set("utm_source", source)
  url.searchParams.set("utm_medium", "share")
  return url.toString()
}

export function playlistShareLead(year: number): string {
  return `My Class of ${year} playlist: the number one hits from the years that shaped me. Find yours:`
}

export function siteShareLead(): string {
  return "A gift of music rediscovery. Enter your graduation year and get the number one hits from the years that shaped you:"
}

export function shareLead(target: ShareTarget, year?: number): string {
  if (target === "playlist") {
    if (!Number.isInteger(year)) throw new Error("A playlist share needs a graduation year")
    return playlistShareLead(year as number)
  }
  return siteShareLead()
}

export function shareMessage(target: ShareTarget, url: string, year?: number): string {
  return `${shareLead(target, year)} ${url}`
}

export function shareSubject(target: ShareTarget, year?: number): string {
  if (target === "playlist") {
    if (!Number.isInteger(year)) throw new Error("A playlist share needs a graduation year")
    return `My Class of ${year} playlist`
  }
  return "A gift of music rediscovery"
}

export function facebookShareUrl(url: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
}

export function xShareUrl(text: string): string {
  return `https://x.com/intent/post?text=${encodeURIComponent(text)}`
}

export function whatsAppShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}

export function smsShareUrl(text: string): string {
  return `sms:?&body=${encodeURIComponent(text)}`
}

export function emailShareUrl(subject: string, body: string): string {
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

export function isAppleUserAgent(userAgent: string): boolean {
  return /\b(iPhone|iPad|iPod|Macintosh)\b/.test(userAgent)
}

export function storyFilename(target: ShareTarget, year?: number): string {
  if (target === "playlist" && Number.isInteger(year)) return `class-of-${year}-story.png`
  return "playlist-time-machine-story.png"
}
