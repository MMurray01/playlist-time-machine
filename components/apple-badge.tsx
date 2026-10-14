import { appleLinkRel, withAppleAffiliate, type AffiliatePlacement } from "@/lib/affiliate"

const BADGE_SRC =
  "https://toolbox.marketingtools.apple.com/api/badges/listen-on/badge/en-us?size=250x83"

export function AppleMusicBadge({
  url,
  title,
  artist,
  placement,
  affiliateToken,
}: {
  url?: string | null
  title: string
  artist: string
  placement: AffiliatePlacement
  affiliateToken?: string | null
}) {
  const destination =
    url || `https://music.apple.com/us/search?term=${encodeURIComponent(`${title} ${artist}`)}`
  const href = withAppleAffiliate(destination, placement, affiliateToken)
  return (
    <a className="apple-badge" href={href} target="_blank" rel={appleLinkRel(affiliateToken)}>
      {/* Official Listen on Apple Music artwork. Do not restyle, crop, or recolor it. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={BADGE_SRC} alt="Listen on Apple Music" width={250} height={83} />
    </a>
  )
}
