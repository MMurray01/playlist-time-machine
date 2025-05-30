"use server"

import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

interface Song {
  title: string
  artist: string
  year: number
  genre: string
  weeks_at_number_one: number
}

interface PlaylistResult {
  songs: Song[]
  totalSongs: number
  genres: string[]
  yearRange: string
}

export async function generatePlaylist(birthYear: number): Promise<{
  success: boolean
  data?: PlaylistResult
  error?: string
}> {
  try {
    // Calculate the formative years (birth year to birth year + 18)
    const startYear = birthYear
    const endYear = birthYear + 18

    console.log(`Generating playlist for birth year ${birthYear}, range: ${startYear}-${endYear}`)

    // Query songs from the database with proper joins
    const { data: songsData, error: songsError } = await supabase
      .from("songs")
      .select(`
        title,
        release_year,
        artists(name),
        genres(name),
        chart_entries(weeks_at_position)
      `)
      .gte("release_year", startYear)
      .lte("release_year", endYear)
      .eq("chart_entries.position", 1)
      .order("release_year", { ascending: true })

    if (songsError) {
      console.error("Database error:", songsError)
      return {
        success: false,
        error: `Database error: ${songsError.message}`,
      }
    }

    if (!songsData || songsData.length === 0) {
      console.log("No songs found for the specified year range")
      return {
        success: false,
        error: `No Billboard #1 hits found for years ${startYear}-${endYear}. Try a different birth year.`,
      }
    }

    console.log(`Found ${songsData.length} songs`)

    // Transform the data
    const songs: Song[] = songsData.map((song: any) => ({
      title: song.title,
      artist: song.artists?.name || "Unknown Artist",
      year: song.release_year,
      genre: song.genres?.name || "Unknown Genre",
      weeks_at_number_one: song.chart_entries?.weeks_at_position || 1,
    }))

    // Get unique genres
    const genres = [...new Set(songs.map((song) => song.genre))].sort()

    const result: PlaylistResult = {
      songs,
      totalSongs: songs.length,
      genres,
      yearRange: `${startYear}-${endYear}`,
    }

    console.log("Playlist generated successfully:", result)

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    console.error("Unexpected error in generatePlaylist:", error)
    return {
      success: false,
      error: "An unexpected error occurred while generating the playlist",
    }
  }
}
