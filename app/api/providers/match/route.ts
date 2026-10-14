import { NextRequest, NextResponse } from "next/server"
import { createAppleSearcher } from "@/lib/providers/apple"
import { readAppleMusicCredentials, signAppleDeveloperToken } from "@/lib/providers/apple-token"
import { matchHits } from "@/lib/providers/match-hits"
import { createSpotifySearcher } from "@/lib/providers/spotify"
import type { MatchTrack } from "@/lib/playlist/types"
import { getSpotifyAppToken } from "@/lib/server/spotify-catalog"
import { SPOTIFY_COOKIES } from "@/lib/server/spotify-oauth"

function parseTracks(value: unknown): MatchTrack[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 25) return null
  const tracks: MatchTrack[] = []
  for (const entry of value) {
    if (!entry || typeof entry !== "object") return null
    const record = entry as Record<string, unknown>
    if (typeof record.key !== "string" || record.key.length === 0 || record.key.length > 200) return null
    if (typeof record.title !== "string" || record.title.length === 0 || record.title.length > 300) return null
    if (typeof record.artist !== "string" || record.artist.length === 0 || record.artist.length > 300) return null
    tracks.push({
      key: record.key,
      title: record.title,
      artist: record.artist,
      spotifyTrackId: typeof record.spotifyTrackId === "string" ? record.spotifyTrackId : null,
    })
  }
  return tracks
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "The lookup request was empty." }, { status: 400 })
  }

  const record = body as Record<string, unknown>
  const provider = record.provider === "apple" ? "apple" : record.provider === "spotify" ? "spotify" : null
  const intent = record.intent === "save" ? "save" : "preview"
  const tracks = parseTracks(record.tracks)
  if (!provider || !tracks) {
    return NextResponse.json({ error: "Those songs could not be checked." }, { status: 400 })
  }

  if (provider === "apple") {
    const credentials = readAppleMusicCredentials()
    if (!credentials) {
      return NextResponse.json({ skipped: true, matches: [], unmatched: [] })
    }
    try {
      const developerToken = await signAppleDeveloperToken({ ...credentials, expiresIn: "1d" })
      const lookup = await matchHits(tracks, createAppleSearcher(fetch, developerToken))
      return NextResponse.json({ skipped: false, ...lookup, unauthorized: false })
    } catch (error) {
      console.error("Apple catalog lookup failed", error instanceof Error ? error.message : "unknown")
      return NextResponse.json({ error: "Apple Music could not be searched." }, { status: 502 })
    }
  }

  const appToken = await getSpotifyAppToken()
  const userToken = request.cookies.get(SPOTIFY_COOKIES.access)?.value ?? null
  const token = appToken ?? (intent === "save" ? userToken : null)
  if (!token) {
    if (intent === "save") {
      return NextResponse.json({ error: "Connect Spotify to look up songs." }, { status: 401 })
    }
    return NextResponse.json({ skipped: true, matches: [], unmatched: [] })
  }

  const lookup = await matchHits(tracks, createSpotifySearcher(fetch, token), { trustStoredId: true })
  if (lookup.unauthorized) {
    return NextResponse.json({ error: "Connect Spotify to look up songs." }, { status: 401 })
  }
  return NextResponse.json({ skipped: false, matches: lookup.matches, unmatched: lookup.unmatched })
}
