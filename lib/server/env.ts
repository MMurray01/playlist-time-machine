import "server-only"

import { readAppleMusicCredentials } from "@/lib/providers/apple-token"
import type { ProviderAvailability } from "@/lib/playlist/types"

export function getProviderAvailability(): ProviderAvailability {
  return { apple: Boolean(readAppleMusicCredentials()) }
}
