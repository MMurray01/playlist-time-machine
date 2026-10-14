import "server-only"

import { randomBytes } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import {
  buildRefreshExchange,
  buildTokenExchange,
  createPkcePair,
  safeEqual,
  safeNextPath,
  spotifyAuthorizeUrl,
} from "@/lib/providers/pkce"
import { spotifyClientId, spotifyClientSecret } from "@/lib/server/env"

export const SPOTIFY_COOKIES = {
  verifier: "ptm_spotify_verifier",
  state: "ptm_spotify_state",
  redirect: "ptm_spotify_redirect",
  next: "ptm_spotify_next",
  access: "ptm_spotify_access",
  refresh: "ptm_spotify_refresh",
} as const

function secureCookie(request: NextRequest, maxAge: number) {
  return {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  }
}

function clearLoginCookies(response: NextResponse) {
  for (const name of [
    SPOTIFY_COOKIES.verifier,
    SPOTIFY_COOKIES.state,
    SPOTIFY_COOKIES.redirect,
    SPOTIFY_COOKIES.next,
  ]) {
    response.cookies.set(name, "", { path: "/", maxAge: 0 })
  }
}

export function beginSpotifyLogin(request: NextRequest): NextResponse {
  const clientId = spotifyClientId()
  if (!clientId) {
    return NextResponse.redirect(new URL("/?notice=spotify_unconfigured", request.url))
  }

  const { verifier, challenge } = createPkcePair()
  const state = randomBytes(16).toString("base64url")
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI || `${request.nextUrl.origin}/callback`
  const next = safeNextPath(request.nextUrl.searchParams.get("next"))
  const response = NextResponse.redirect(spotifyAuthorizeUrl({ clientId, redirectUri, challenge, state }))
  const tenMinutes = secureCookie(request, 60 * 10)
  response.cookies.set(SPOTIFY_COOKIES.verifier, verifier, tenMinutes)
  response.cookies.set(SPOTIFY_COOKIES.state, state, tenMinutes)
  response.cookies.set(SPOTIFY_COOKIES.redirect, redirectUri, tenMinutes)
  response.cookies.set(SPOTIFY_COOKIES.next, next, tenMinutes)
  return response
}

export async function completeSpotifyLogin(request: NextRequest): Promise<NextResponse> {
  const fail = (notice: string) => {
    const response = NextResponse.redirect(new URL(`/?notice=${notice}`, request.url))
    clearLoginCookies(response)
    return response
  }

  const oauthError = request.nextUrl.searchParams.get("error")
  if (oauthError === "access_denied") return fail("spotify_denied")

  const code = request.nextUrl.searchParams.get("code")
  const state = request.nextUrl.searchParams.get("state")
  const expected = request.cookies.get(SPOTIFY_COOKIES.state)?.value
  const verifier = request.cookies.get(SPOTIFY_COOKIES.verifier)?.value
  const redirectUri = request.cookies.get(SPOTIFY_COOKIES.redirect)?.value
  const next = safeNextPath(request.cookies.get(SPOTIFY_COOKIES.next)?.value)

  if (!code || !state || !expected || !verifier || !redirectUri || !safeEqual(state, expected)) {
    return fail("spotify_expired")
  }

  const clientId = spotifyClientId()
  if (!clientId) return fail("spotify_unconfigured")

  const exchange = buildTokenExchange({
    clientId,
    clientSecret: spotifyClientSecret(),
    code,
    redirectUri,
    verifier,
  })
  const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: exchange.headers,
    body: exchange.body,
  })
  if (!tokenResponse.ok) return fail("spotify_failed")

  const tokens = (await tokenResponse.json()) as {
    access_token?: string
    refresh_token?: string
    expires_in?: number
  }
  if (!tokens.access_token) return fail("spotify_failed")

  const destination = new URL(next, request.url)
  destination.searchParams.set("resume", "spotify")
  const response = NextResponse.redirect(destination)
  clearLoginCookies(response)
  response.cookies.set(
    SPOTIFY_COOKIES.access,
    tokens.access_token,
    secureCookie(request, tokens.expires_in ?? 3600),
  )
  if (tokens.refresh_token) {
    response.cookies.set(SPOTIFY_COOKIES.refresh, tokens.refresh_token, secureCookie(request, 60 * 60 * 24 * 30))
  }
  return response
}

export async function refreshSpotifyAccessToken(refreshToken: string): Promise<{
  accessToken: string
  refreshToken: string
  expiresIn: number
} | null> {
  const clientId = spotifyClientId()
  if (!clientId) return null
  const exchange = buildRefreshExchange({
    clientId,
    clientSecret: spotifyClientSecret(),
    refreshToken,
  })
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: exchange.headers,
    body: exchange.body,
  })
  if (!response.ok) return null
  const tokens = (await response.json()) as {
    access_token?: string
    refresh_token?: string
    expires_in?: number
  }
  if (!tokens.access_token) return null
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || refreshToken,
    expiresIn: tokens.expires_in ?? 3600,
  }
}
