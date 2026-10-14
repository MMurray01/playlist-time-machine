import { NextRequest, NextResponse } from "next/server"
import { createSpotifyPlaylist } from "@/lib/providers/spotify"
import { clipTitle } from "@/lib/playlist/window"
import { refreshSpotifyAccessToken, SPOTIFY_COOKIES } from "@/lib/server/spotify-oauth"

const SPOTIFY_ID = /^[A-Za-z0-9]{10,40}$/

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "The save request was empty." }, { status: 400 })
  }

  const record = body as Record<string, unknown>
  const name = clipTitle(typeof record.name === "string" ? record.name : "")
  const description = typeof record.description === "string" ? record.description.slice(0, 300) : ""
  const trackIds = Array.isArray(record.trackIds)
    ? record.trackIds.filter((id): id is string => typeof id === "string" && SPOTIFY_ID.test(id))
    : []

  if (!name || !Array.isArray(record.trackIds) || record.trackIds.length === 0 || record.trackIds.length > 500) {
    return NextResponse.json({ error: "Choose a playlist before saving." }, { status: 400 })
  }
  if (trackIds.length !== record.trackIds.length) {
    return NextResponse.json({ error: "Some Spotify songs were not valid." }, { status: 400 })
  }

  let token = request.cookies.get(SPOTIFY_COOKIES.access)?.value ?? null
  let refreshed: { accessToken: string; refreshToken: string; expiresIn: number } | null = null
  if (!token) {
    const refresh = request.cookies.get(SPOTIFY_COOKIES.refresh)?.value
    if (refresh) refreshed = await refreshSpotifyAccessToken(refresh)
    token = refreshed?.accessToken ?? null
  }
  if (!token) {
    return NextResponse.json({ error: "Connect Spotify to save this playlist." }, { status: 401 })
  }

  const result = await createSpotifyPlaylist(fetch, {
    token,
    name,
    description,
    trackIds,
  })

  const response = NextResponse.json(
    {
      ok: result.ok,
      playlistUrl: result.playlistUrl,
      addedCount: result.addedCount,
      requestedCount: result.requestedCount,
      error: result.error,
    },
    { status: result.status === 401 ? 401 : result.ok ? 200 : 502 },
  )

  if (refreshed) {
    const secure = request.nextUrl.protocol === "https:"
    response.cookies.set(SPOTIFY_COOKIES.access, refreshed.accessToken, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: refreshed.expiresIn,
    })
    response.cookies.set(SPOTIFY_COOKIES.refresh, refreshed.refreshToken, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    })
  }

  return response
}
