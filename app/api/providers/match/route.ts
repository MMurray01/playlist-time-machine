import { NextRequest, NextResponse } from "next/server"
import catalogFile from "@/data/catalog-matches.json"
import { partitionStaticTracks, type StaticCatalogFile } from "@/lib/playlist/catalog-static"
import { readAppleMusicCredentials, signAppleDeveloperToken } from "@/lib/providers/apple-token"
import { createCatalogSearcher } from "@/lib/providers/catalog-search"
import { matchHits } from "@/lib/providers/match-hits"
import type { MatchTrack } from "@/lib/playlist/types"
import { catalogCacheKey, readCatalogCache, writeCatalogCache } from "@/lib/server/catalog-cache"

const staticSongs = (catalogFile as StaticCatalogFile).songs

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
    const isrc = typeof record.isrc === "string" ? record.isrc.trim() : ""
    tracks.push({
      key: record.key,
      title: record.title,
      artist: record.artist,
      appleSongId: APPLE_SONG_ID.test(appleSongId) ? appleSongId : null,
      isrc: /^[A-Za-z0-9]{12}$/.test(isrc) ? isrc.toUpperCase() : null,
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

  const known = partitionStaticTracks(tracks, staticSongs)
  if (known.unknown.length === 0) {
    return NextResponse.json({
      skipped: false,
      source: "static",
      matches: known.matches,
      unmatched: known.unmatched,
    })
  }

  const credentials = readAppleMusicCredentials()
  let developerToken: string | null = null
  if (credentials) {
    try {
      developerToken = await signAppleDeveloperToken({ ...credentials, expiresIn: "1d" })
    } catch (error) {
      console.error("Apple developer token failed", error instanceof Error ? error.message : "unknown")
    }
  }

  try {
    const search = createCatalogSearcher(fetch, { developerToken })
    const lookup = await matchHits(known.unknown, async (hit) => {
      const key = catalogCacheKey(hit)
      const cached = readCatalogCache(key)
      if (cached && cached.length > 0) return cached
      const found = await search(hit)
      if (found.length > 0) writeCatalogCache(key, found)
      return found
    })
    return NextResponse.json({
      skipped: false,
      source: "search",
      matches: [...known.matches, ...lookup.matches],
      unmatched: [...known.unmatched, ...lookup.unmatched],
    })
  } catch (error) {
    console.error("Apple catalog lookup failed", error instanceof Error ? error.message : "unknown")
    return NextResponse.json({ error: "Apple Music could not be searched." }, { status: 502 })
  }
}
