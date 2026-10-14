import { createHash, randomBytes, timingSafeEqual } from "node:crypto"

export function createPkcePair(): { verifier: string; challenge: string } {
  const verifier = randomBytes(64).toString("base64url")
  const challenge = createHash("sha256").update(verifier).digest("base64url")
  return { verifier, challenge }
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

export function spotifyAuthorizeUrl(input: {
  clientId: string
  redirectUri: string
  challenge: string
  state: string
}): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: input.clientId,
    scope: "playlist-modify-private playlist-modify-public",
    redirect_uri: input.redirectUri,
    code_challenge_method: "S256",
    code_challenge: input.challenge,
    state: input.state,
  })
  return `https://accounts.spotify.com/authorize?${params.toString()}`
}

export function buildTokenExchange(input: {
  clientId: string
  clientSecret?: string | null
  code: string
  redirectUri: string
  verifier: string
}): { headers: Record<string, string>; body: string } {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: input.code,
    redirect_uri: input.redirectUri,
    client_id: input.clientId,
    code_verifier: input.verifier,
  })
  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  }
  if (input.clientSecret) {
    headers.Authorization = `Basic ${Buffer.from(`${input.clientId}:${input.clientSecret}`).toString("base64")}`
  }
  return { headers, body: body.toString() }
}

export function buildRefreshExchange(input: {
  clientId: string
  clientSecret?: string | null
  refreshToken: string
}): { headers: Record<string, string>; body: string } {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: input.refreshToken,
    client_id: input.clientId,
  })
  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  }
  if (input.clientSecret) {
    headers.Authorization = `Basic ${Buffer.from(`${input.clientId}:${input.clientSecret}`).toString("base64")}`
  }
  return { headers, body: body.toString() }
}

export function safeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/"
  }
  return value
}
