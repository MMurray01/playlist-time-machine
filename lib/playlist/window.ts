/** Earliest class year the picker will offer before the chart library narrows it. */
export const MIN_GRADUATION_YEAR = 1955
export const WINDOW_YEARS_BEFORE = 5
export const WINDOW_YEARS_AFTER = 5

export function currentCalendarYear(now: Date = new Date()): number {
  return now.getFullYear()
}

export function graduationYearLimits(input?: {
  now?: Date
  chartMinYear?: number | null
  chartMaxYear?: number | null
}): { min: number; max: number } {
  const nowYear = currentCalendarYear(input?.now ?? new Date())
  let min = MIN_GRADUATION_YEAR
  let max = nowYear
  if (typeof input?.chartMinYear === "number" && Number.isInteger(input.chartMinYear)) {
    min = Math.max(min, input.chartMinYear - WINDOW_YEARS_BEFORE)
  }
  if (typeof input?.chartMaxYear === "number" && Number.isInteger(input.chartMaxYear)) {
    max = Math.min(max, input.chartMaxYear + WINDOW_YEARS_AFTER)
  }
  if (max < min) max = min
  return { min, max }
}

export function isValidGraduationYear(
  year: number,
  limits: { min: number; max: number } = graduationYearLimits(),
): boolean {
  return Number.isInteger(year) && year >= limits.min && year <= limits.max
}

export function graduationYearMessage(
  year: number,
  limits: { min: number; max: number },
  nowYear: number = currentCalendarYear(),
): string {
  if (Number.isInteger(year) && year > nowYear) {
    return `Use the year you graduated high school. ${year} hasn’t happened yet.`
  }
  if (Number.isInteger(year) && (year > limits.max || year < limits.min)) {
    return `The chart library doesn’t cover the years around ${year}. Use a year from ${limits.min} through ${limits.max}.`
  }
  return `Enter the year you graduated high school, from ${limits.min} through ${limits.max}.`
}

export function emptyChartMessage(year: number): string {
  return `The chart library has no No. 1s for the years around ${year}.`
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
  return `Number one hits from ${startYear} through ${endYear}, the popular songs of the time. Made with Playlist Time Machine.`
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
