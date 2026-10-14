/**
 * Build data/catalog-matches.json from the song library.
 *
 * Reads songs (no writes) and looks each one up with the same Apple/iTunes
 * matcher the site uses. The public iTunes limit is about 20 calls a minute;
 * the searcher waits that out. Re-running skips song ids already in the file.
 *
 *   pnpm catalog
 */
import { readFileSync, renameSync, writeFileSync } from "node:fs"
import { createCatalogSearcher } from "../lib/providers/catalog-search"
import { chooseCatalogMatch } from "../lib/playlist/match"
import type { CatalogMatchRecord, StaticCatalogFile } from "../lib/playlist/catalog-static"

const OUT = new URL("../data/catalog-matches.json", import.meta.url)

interface SongRow {
  id: number
  title: string
  artist: string
}

function loadEnv(): Record<string, string> {
  const text = readFileSync(new URL("../.env.local", import.meta.url), "utf8")
  const env: Record<string, string> = {}
  for (const line of text.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const index = trimmed.indexOf("=")
    if (index === -1) continue
    env[trimmed.slice(0, index)] = trimmed.slice(index + 1)
  }
  return env
}

function artistName(value: unknown): string {
  if (!value) return ""
  if (Array.isArray(value)) return artistName(value[0])
  if (typeof value === "object" && "name" in value && typeof value.name === "string") return value.name.trim()
  return ""
}

async function fetchSongs(env: Record<string, string>): Promise<SongRow[]> {
  const base = env.NEXT_PUBLIC_SUPABASE_URL
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!base || !key) throw new Error("Supabase URL and anon key are required")
  const headers = { apikey: key, Authorization: `Bearer ${key}` }
  const rows: SongRow[] = []
  for (let from = 0; from < 20000; from += 1000) {
    const response = await fetch(`${base}/rest/v1/songs?select=id,title,artists(name)&order=id.asc`, {
      headers: { ...headers, Range: `${from}-${from + 999}` },
    })
    if (!response.ok) throw new Error(`songs ${response.status}`)
    const page = (await response.json()) as { id?: number; title?: string; artists?: unknown }[]
    for (const row of page) {
      if (typeof row.id !== "number" || typeof row.title !== "string" || !row.title.trim()) continue
      rows.push({ id: row.id, title: row.title.trim(), artist: artistName(row.artists) })
    }
    if (page.length < 1000) break
  }
  return rows
}

function readCatalog(): StaticCatalogFile {
  try {
    const parsed = JSON.parse(readFileSync(OUT, "utf8")) as StaticCatalogFile
    if (parsed && parsed.songs && typeof parsed.songs === "object") {
      return { version: 1, generatedAt: parsed.generatedAt ?? "", songs: parsed.songs }
    }
  } catch {
    // A missing file starts empty. A half-written file is replaced from the last rename.
  }
  return { version: 1, generatedAt: "", songs: {} }
}

function writeCatalog(file: StaticCatalogFile) {
  const tmp = new URL("../data/catalog-matches.json.tmp", import.meta.url)
  writeFileSync(tmp, `${JSON.stringify(file)}\n`)
  renameSync(tmp, OUT)
}

function recordOf(match: { id: string; artworkUrl: string | null; previewUrl?: string | null; url: string | null }): CatalogMatchRecord {
  return {
    catalogId: match.id,
    artworkUrl: match.artworkUrl,
    previewUrl: match.previewUrl ?? null,
    url: match.url,
  }
}

async function main() {
  const env = loadEnv()
  const songs = await fetchSongs(env)
  const file = readCatalog()
  const search = createCatalogSearcher(fetch, { developerToken: null })
  const pending = songs.filter((song) => !Object.prototype.hasOwnProperty.call(file.songs, String(song.id)))
  console.log(`songs ${songs.length}, already matched ${songs.length - pending.length}, to do ${pending.length}`)
  const started = Date.now()
  let done = 0
  const errors: number[] = []

  async function lookup(song: SongRow): Promise<boolean> {
    if (!song.artist) {
      file.songs[String(song.id)] = null
      return true
    }
    try {
      const candidates = await search({ title: song.title, artist: song.artist })
      const match = chooseCatalogMatch({ title: song.title, artist: song.artist }, candidates)
      file.songs[String(song.id)] = match ? recordOf(match) : null
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : "lookup failed"
      console.error(`retry ${song.id} ${song.title}: ${message}`)
      return false
    }
  }

  for (const song of pending) {
    const saved = await lookup(song)
    if (!saved) errors.push(song.id)
    else {
      done += 1
      file.generatedAt = new Date().toISOString()
      writeCatalog(file)
      if (done % 25 === 0 || done === pending.length) {
        const elapsed = (Date.now() - started) / 1000
        const rate = done / Math.max(elapsed, 1)
        const left = Math.round((pending.length - done) / Math.max(rate, 0.01))
        console.log(`${done}/${pending.length} in ${Math.round(elapsed)}s, about ${left}s left`)
      }
    }
  }

  for (const id of errors) {
    const song = songs.find((row) => row.id === id)
    if (!song) continue
    const saved = await lookup(song)
    if (!saved) file.songs[String(id)] = null
  }

  file.generatedAt = new Date().toISOString()
  writeCatalog(file)
  const hits = Object.values(file.songs).filter((row) => row?.artworkUrl).length
  const misses = Object.values(file.songs).filter((row) => !row?.artworkUrl).length
  console.log(`wrote ${Object.keys(file.songs).length} songs, ${hits} with artwork, ${misses} without`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "catalog build failed")
  process.exit(1)
})
