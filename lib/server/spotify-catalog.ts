import "server-only"

import { spotifyClientId, spotifyClientSecret } from "@/lib/server/env"

let cached: { token: string; expiresAt: number } | null = null

export async function getSpotifyAppToken(): Promise<string | null> {
  const clientId = spotifyClientId()
  const secret = spotifyClientSecret()
  if (!clientId || !secret) return null
  if (cached && cached.expiresAt > Date.now() + 30_000) return cached.token

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
  })
  if (!response.ok) return null
  const body = (await response.json()) as { access_token?: string; expires_in?: number }
  if (!body.access_token) return null
  cached = {
    token: body.access_token,
    expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000,
  }
  return body.access_token
}
