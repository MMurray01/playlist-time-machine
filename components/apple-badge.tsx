const BADGE_SRC =
  "https://toolbox.marketingtools.apple.com/api/badges/listen-on/badge/en-us?size=250x83"

export function AppleMusicBadge({
  url,
  title,
  artist,
}: {
  url?: string | null
  title: string
  artist: string
}) {
  const href =
    url || `https://music.apple.com/us/search?term=${encodeURIComponent(`${title} ${artist}`)}`
  return (
    <a className="apple-badge" href={href} target="_blank" rel="noopener noreferrer">
      {/* Official badge artwork. Do not restyle the image. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={BADGE_SRC} alt="Listen on Apple Music" width={140} height={46} />
    </a>
  )
}
