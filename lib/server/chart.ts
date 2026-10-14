import "server-only"

import { buildPlaylist, mapHitRow } from "@/lib/playlist/hits"
import type { BuiltPlaylist, ChartHit } from "@/lib/playlist/types"
import { graduationWindow, isValidGraduationYear } from "@/lib/playlist/window"
import { createReadClient } from "@/lib/server/supabase"

const HIT_COLUMNS =
  "song_id, year, week_number, chart_date, title, artist_name, genre, spotify_track_id, weeks_at_position"

export async function listChartGenres(): Promise<{
  genres: string[]
  configured: boolean
  error: string | null
}> {
  const client = createReadClient()
  if (!client) {
    return { genres: [], configured: false, error: "The chart library is not connected yet." }
  }

  const names = new Set<string>()
  try {
    for (let from = 0; from < 10000; from += 1000) {
      const { data, error } = await client
        .from("number_one_hits")
        .select("genre")
        .order("genre", { ascending: true })
        .range(from, from + 999)
      if (error) {
        return { genres: [], configured: true, error: "The chart library could not be read." }
      }
      for (const row of data ?? []) {
        if (typeof row.genre === "string" && row.genre.trim()) names.add(row.genre.trim())
      }
      if (!data || data.length < 1000) break
    }
  } catch {
    return { genres: [], configured: true, error: "The chart library could not be read." }
  }

  return {
    genres: [...names].sort((a, b) => a.localeCompare(b)),
    configured: true,
    error: null,
  }
}

export async function loadBuiltPlaylist(input: {
  graduationYear: number
  genres: string[]
  title?: string
}): Promise<{ ok: true; playlist: BuiltPlaylist } | { ok: false; error: string }> {
  if (!isValidGraduationYear(input.graduationYear)) {
    return { ok: false, error: "Enter a graduation year from 1955 through 2035." }
  }

  const client = createReadClient()
  if (!client) {
    return { ok: false, error: "The chart library is not connected yet." }
  }

  const { startYear, endYear } = graduationWindow(input.graduationYear)
  const hits: ChartHit[] = []

  try {
    for (let from = 0; from < 5000; from += 1000) {
      const { data, error } = await client
        .from("number_one_hits")
        .select(HIT_COLUMNS)
        .gte("year", startYear)
        .lte("year", endYear)
        .order("chart_date", { ascending: true })
        .order("week_number", { ascending: true })
        .order("song_id", { ascending: true })
        .range(from, from + 999)

      if (error) {
        return { ok: false, error: "The chart library could not be read. Try again in a moment." }
      }

      for (const row of data ?? []) {
        const hit = mapHitRow(row as Record<string, unknown>)
        if (hit) hits.push(hit)
      }
      if (!data || data.length < 1000) break
    }
  } catch {
    return { ok: false, error: "The chart library could not be read. Try again in a moment." }
  }

  return {
    ok: true,
    playlist: buildPlaylist({
      graduationYear: input.graduationYear,
      genres: input.genres,
      hits,
      title: input.title,
    }),
  }
}
