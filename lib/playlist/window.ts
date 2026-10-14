export const MIN_GRADUATION_YEAR = 1955
export const MAX_GRADUATION_YEAR = 2035
export const WINDOW_YEARS_BEFORE = 5
export const WINDOW_YEARS_AFTER = 5

export function isValidGraduationYear(year: number): boolean {
  return Number.isInteger(year) && year >= MIN_GRADUATION_YEAR && year <= MAX_GRADUATION_YEAR
}

/** Eleven chart years: five before the graduation year through five after. */
export function graduationWindow(graduationYear: number): { startYear: number; endYear: number } {
  if (!Number.isInteger(graduationYear)) {
    throw new Error("Graduation year must be a whole number")
  }

  return {
    startYear: graduationYear - WINDOW_YEARS_BEFORE,
    endYear: graduationYear + WINDOW_YEARS_AFTER,
  }
}

export function defaultPlaylistTitle(graduationYear: number): string {
  return `Class of ${graduationYear}`
}

export function playlistDescription(startYear: number, endYear: number): string {
  return `Billboard Hot 100 No. 1s from ${startYear} through ${endYear}, in chart order. Made with Playlist Time Machine.`
}

export function clipTitle(value: string): string {
  return value
    .replace(/[\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80)
}

export function cleanPlaylistTitle(value: string, graduationYear: number): string {
  return clipTitle(value) || defaultPlaylistTitle(graduationYear)
}
