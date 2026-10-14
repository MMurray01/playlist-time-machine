import "server-only"

import { readAppleMusicCredentials } from "@/lib/providers/apple-token"
import type { ProviderAvailability } from "@/lib/playlist/types"

export function spotifyClientId(): string | null {
  const id = process.env.SPOTIFY_CLIENT_ID || process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID
  return id?.trim() || null
}

export function spotifyClientSecret(): string | null {
  return process.env.SPOTIFY_CLIENT_SECRET?.trim() || null
}

export function getProviderAvailability(): ProviderAvailability {
  const spotify = Boolean(spotifyClientId())
  const apple = Boolean(readAppleMusicCredentials())
  return {
    spotify,
    apple,
    spotifyCatalog: Boolean(spotify && spotifyClientSecret()),
  }
}
