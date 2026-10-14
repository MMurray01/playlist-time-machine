import { NextRequest, NextResponse } from "next/server"
import { createAppleSearcher } from "@/lib/providers/apple"
import { readAppleMusicCredentials, signAppleDeveloperToken } from "@/lib/providers/apple-token"
import { matchHits } from "@/lib/providers/match-hits"
import type { CatalogCandidate, MatchTrack } from "@/lib/playlist/types"
import { catalogCacheKey, readCatalogCache, writeCatalogCache } from "@/lib/server/catalog-cache"

const APPLE_SONG_ID = /^[0-9]{2,18}$/

function parseTracks(value: unknown): MatchTrack[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 25) return null
  const tracks: MatchTrack[] = []
  for (const entry of value) {
    if (!entry || typeof entry !== "object") return null
    const record = entry as Record<string, unknown>
    if (typeof record.key !== "string" || record.key.length === 0 || record.key.length > 200) return null
    if (typeof record.title !== "string" || record.title.length === 0 || record.title.length > 300) return null
    if (typeof record.artist !== "string" || record.artist.length === 0 || record.artist.length > 300) return null
    const appleSongId = typeof record.appleSongId === "string" ? record.appleSongId.trim() : ""
    tracks.push({
      key: record.key,
      title: record.title,
      artist: record.artist,
      appleSongId: APPLE_SONG_ID.test(appleSongId) ? appleSongId : null,
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
  const tracks = parseTracks(record.tracks)
  if (!tracks) {
    return NextResponse.json({ error: "Those songs could not be checked." }, { status: 400 })
  }

  const credentials = readAppleMusicCredentials()
  if (!credentials) {
    return NextResponse.json({ skipped: true, matches: [], unmatched: [] })
  }

  try {
    const developerToken = await signAppleDeveloperToken({ ...credentials, expiresIn: "1d" })
    const search = createAppleSearcher(fetch, developerToken)
    const lookup = await matchHits(tracks, async (hit) => {
      const key = catalogCacheKey(hit)
      const cached = readCatalogCache(key)
      if (cached) return cached
      const found: CatalogCandidate[] = await search(hit)
      writeCatalogCache(key, found)
      return found
    })
    return NextResponse.json({ skipped: false, ...lookup })
  } catch (error) {
    console.error("Apple catalog lookup failed", error instanceof Error ? error.message : "unknown")
    return NextResponse.json({ error: "Apple Music could not be searched." }, { status: 502 })
  }
}
