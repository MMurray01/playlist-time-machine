"use server"

import { getChartYearSpan, loadBuiltPlaylist } from "@/lib/server/chart"
import { createSharedPlaylist } from "@/lib/server/share"
import type { BuiltPlaylist } from "@/lib/playlist/types"
import {
  cleanPlaylistTitle,
  emptyChartMessage,
  graduationYearLimits,
  graduationYearMessage,
  isValidGraduationYear,
} from "@/lib/playlist/window"

export async function generatePlaylistAction(
  graduationYear: number,
): Promise<{ ok: true; playlist: BuiltPlaylist } | { ok: false; error: string }> {
  const span = await getChartYearSpan()
  const limits = graduationYearLimits({ chartMinYear: span.minYear, chartMaxYear: span.maxYear })
  if (!isValidGraduationYear(graduationYear, limits)) {
    return { ok: false, error: graduationYearMessage(graduationYear, limits) }
  }
  const result = await loadBuiltPlaylist({ graduationYear, genres: [] })
  if (result.ok && result.playlist.hits.length === 0) {
    return { ok: false, error: emptyChartMessage(graduationYear) }
  }
  return result
}

export async function sharePlaylistAction(input: {
  graduationYear: number
  title: string
}): Promise<
  | { ok: true; id: string; url: string }
  | { ok: false; error: string; status?: number; retryAfterSeconds?: number }
> {
  return createSharedPlaylist({
    graduationYear: input.graduationYear,
    genres: [],
    title: cleanPlaylistTitle(input.title, input.graduationYear),
  })
}
