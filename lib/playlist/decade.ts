/** Chart decade for year stories. The page does not theme colors by decade. */
export function decadeOf(year: number): number {
  return Math.floor(year / 10) * 10
}
