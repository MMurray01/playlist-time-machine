import "server-only"

import { activeAffiliateToken } from "@/lib/affiliate"
import { readAppleMusicCredentials } from "@/lib/providers/apple-token"
import type { ProviderAvailability } from "@/lib/playlist/types"

export function getProviderAvailability(): ProviderAvailability {
  return { apple: Boolean(readAppleMusicCredentials()) }
}

/** Server-only. Passed into client links so the token is not a public build variable. */
export function getAffiliateToken(): string | null {
  // Dynamic lookup so the value is read when the server runs, not baked in at build.
  const name = "APPLE_AFFILIATE_TOKEN"
  return activeAffiliateToken(process.env[name])
}
