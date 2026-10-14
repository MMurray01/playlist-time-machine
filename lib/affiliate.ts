/** Placements passed as Apple's ct= campaign name. */
export const AFFILIATE_PLACEMENTS = ["save-flow", "preview-badge", "from-spotify", "share-page"] as const

export type AffiliatePlacement = (typeof AFFILIATE_PLACEMENTS)[number]

const APPLE_MUSIC_HOSTS = new Set(["music.apple.com", "geo.music.apple.com"])

/**
 * A token that can be placed in at= without breaking the link.
 * Empty, or anything with reserved URL characters, is treated as unset.
 */
export function activeAffiliateToken(token: string | null | undefined): string | null {
  const value = token?.trim() ?? ""
  if (!value || value.length > 64) return null
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null
  return value
}

/**
 * Append Apple's affiliate parameters when a token is set.
 * app=music and ls=1 are required by the Performance Partners linking guide
 * so a click can be attributed. Without a token the URL is unchanged.
 */
export function withAppleAffiliate(
  url: string,
  placement: AffiliatePlacement,
  token: string | null | undefined,
): string {
  const affiliate = activeAffiliateToken(token)
  if (!affiliate) return url

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return url
  }

  if (!APPLE_MUSIC_HOSTS.has(parsed.hostname.toLowerCase())) return url

  const params = parsed.searchParams
  params.set("app", "music")
  params.set("at", affiliate)
  params.set("ct", placement)
  params.set("ls", "1")
  parsed.search = params.toString()
  return parsed.toString()
}

/** Partner links need rel=nofollow. Plain Apple links stay free of it. */
export function appleLinkRel(token: string | null | undefined): string {
  return activeAffiliateToken(token) ? "nofollow noopener noreferrer" : "noopener noreferrer"
}
