"use server"

import { loadBuiltPlaylist } from "@/lib/server/chart"
import { createSharedPlaylist } from "@/lib/server/share"
import type { BuiltPlaylist } from "@/lib/playlist/types"
import { cleanPlaylistTitle, isValidGraduationYear } from "@/lib/playlist/window"

function cleanGenres(genres: string[]): string[] {
  return [...new Set(genres.map((genre) => genre.trim()).filter(Boolean))].slice(0, 12)
}

export async function generatePlaylistAction(
  graduationYear: number,
  genres: string[],
): Promise<{ ok: true; playlist: BuiltPlaylist } | { ok: false; error: string }> {
  if (!isValidGraduationYear(graduationYear)) {
    return { ok: false, error: "Enter a graduation year from 1955 through 2035." }
  }
  return loadBuiltPlaylist({ graduationYear, genres: cleanGenres(genres) })
}

export async function sharePlaylistAction(input: {
  graduationYear: number
  genres: string[]
  title: string
}): Promise<{ ok: true; id: string; url: string } | { ok: false; error: string }> {
  return createSharedPlaylist({
    graduationYear: input.graduationYear,
    genres: cleanGenres(input.genres),
    title: cleanPlaylistTitle(input.title, input.graduationYear),
  })
}
