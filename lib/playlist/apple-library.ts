import { planCollage, type CollagePlan, type CollageSource } from "@/lib/playlist/collage"
import { playlistDescription } from "@/lib/playlist/window"

/** Apple documents library-playlist create attributes as name and description only. */
export const APPLE_LIBRARY_DESCRIPTION_MAX = 300

/**
 * Current iPhone path from Apple's Music guide: open the playlist, tap More,
 * tap Edit, then add your own photo. The photo control sits on the cover.
 */
export const APPLE_COVER_TIP =
  "In Apple Music, open the playlist, tap \u2026, tap Edit, then tap the photo button to choose this image."

export function appleLibraryPlaylistName(graduationYear: number): string {
  return `Class of ${graduationYear} \u00b7 Playlist Time Machine`
}

export function appleLibraryPlaylistDescription(
  startYear: number,
  endYear: number,
  shareUrl?: string | null,
): string {
  const base = playlistDescription(startYear, endYear)
  const url = shareUrl?.trim()
  if (!url) return base
  const withUrl = `${base} ${url}`
  return withUrl.length <= APPLE_LIBRARY_DESCRIPTION_MAX ? withUrl : base
}

export function libraryCoverFilename(graduationYear: number): string {
  return `class-of-${graduationYear}-cover.png`
}

/** Square collage Apple Music can show once the listener sets it as the cover. */
export function libraryCoverPlan(input: {
  graduationYear: number
  startYear: number
  endYear: number
  hits: readonly CollageSource[]
}): CollagePlan {
  const plan = planCollage({
    format: "square",
    layout: "mosaic",
    title: `Class of ${input.graduationYear}`,
    startYear: input.startYear,
    endYear: input.endYear,
    hits: input.hits,
  })
  return {
    ...plan,
    headline: `Class of ${input.graduationYear}`,
    mark: "Playlist Time Machine",
  }
}
