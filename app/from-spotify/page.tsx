import type { Metadata } from "next"
import Link from "next/link"
import { FromSpotify } from "@/components/from-spotify"
import { getAffiliateToken } from "@/lib/server/env"

export const metadata: Metadata = {
  title: "Coming from Spotify? · Playlist Time Machine",
  description: "Save a class playlist to Apple Music, start a trial, or transfer music you already saved.",
}

export default function FromSpotifyPage() {
  return (
    <main className="sheet px-1 py-16 sm:py-24">
      <p className="wordmark">
        <Link href="/">Playlist Time Machine</Link>
      </p>
      <FromSpotify affiliateToken={getAffiliateToken()} />
    </main>
  )
}
