import "server-only"

import { buildPlaylist, mapHitRow } from "@/lib/playlist/hits"
import type { BuiltPlaylist, ChartHit } from "@/lib/playlist/types"
import { graduationWindow, graduationYearLimits, graduationYearMessage, isValidGraduationYear } from "@/lib/playlist/window"
import { createReadClient } from "@/lib/server/supabase"

const HIT_COLUMNS =
  "song_id, year, week_number, chart_date, title, artist_name, genre, weeks_at_position"

export async function getChartYearSpan(): Promise<{
  minYear: number | null
  maxYear: number | null
  error: string | null
}> {
  const client = createReadClient()
  if (!client) {
    return { minYear: null, maxYear: null, error: "The chart library is not connected yet." }
  }

  try {
    const [earliest, latest] = await Promise.all([
      client.from("number_one_hits").select("year").order("year", { ascending: true }).limit(1),
      client.from("number_one_hits").select("year").order("year", { ascending: false }).limit(1),
    ])
    if (earliest.error || latest.error) {
      return { minYear: null, maxYear: null, error: "The chart library could not be read." }
    }
    const minYear = earliest.data?.[0]?.year
    const maxYear = latest.data?.[0]?.year
    return {
      minYear: typeof minYear === "number" ? minYear : null,
      maxYear: typeof maxYear === "number" ? maxYear : null,
      error: null,
    }
  } catch {
    return { minYear: null, maxYear: null, error: "The chart library could not be read." }
  }
}

export async function loadBuiltPlaylist(input: {
  graduationYear: number
  genres: string[]
  title?: string
}): Promise<{ ok: true; playlist: BuiltPlaylist } | { ok: false; error: string }> {
  const limits = graduationYearLimits()
  if (!isValidGraduationYear(input.graduationYear, limits)) {
    return { ok: false, error: graduationYearMessage(input.graduationYear, limits) }
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
