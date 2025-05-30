"use server"

import { getNumberOneHitsByYearAndGenre, type Song, type PlaylistResult } from "@/lib/database"

export async function generatePlaylistAction(
  birthYear: number,
  birthMonth: string,
  selectedGenres: string[],
): Promise<PlaylistResult> {
  // Calculate formative years (ages 12-22) as per PRD - exactly 11 years
  const startYear = birthYear + 12
  const endYear = birthYear + 22
  const formativeYears = `${startYear}-${endYear}`

  console.log(`\n=== PLAYLIST GENERATION ===`)
  console.log(`Birth year: ${birthYear} (${birthMonth})`)
  console.log(`Formative years: ${startYear}-${endYear} (ages 12-22)`)
  console.log(`Years covered: ${endYear - startYear + 1} years`)
  console.log(`Selected genres: ${selectedGenres.join(", ")}`)
  console.log(`Target: ${(endYear - startYear + 1) * 10} songs (10 per year)`)

  // Fetch Billboard #1 hits from database - exactly 10 songs per year
  const songs = await getNumberOneHitsByYearAndGenre(startYear, endYear, selectedGenres)

  console.log(`Generated ${songs.length} Billboard #1 hits`)

  // Group songs by year for display
  const songsByYear: { [year: number]: Song[] } = {}
  for (let year = startYear; year <= endYear; year++) {
    songsByYear[year] = songs.filter((song) => song.year === year)
    console.log(`Year ${year}: ${songsByYear[year].length} songs`)
  }

  // Verify we have exactly 10 songs per year
  const totalExpected = (endYear - startYear + 1) * 10
  if (songs.length !== totalExpected) {
    console.warn(`WARNING: Expected ${totalExpected} songs but got ${songs.length}`)
  }

  return {
    birthYear,
    birthMonth,
    formativeYears,
    selectedGenres,
    songs,
    songsByYear,
  }
}
