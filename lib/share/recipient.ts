/** Query flag for visits that started from a received playlist page. */
export const SHARE_PAGE_REF = "share-page"

export function recipientPrompt(graduationYear: number): string {
  return `Someone shared their Class of ${graduationYear} playlist with you.`
}

export function recipientQuestion(): string {
  return "What was your graduation year?"
}

export function makePlaylistHref(year: number): string {
  const params = new URLSearchParams({
    year: String(year),
    ref: SHARE_PAGE_REF,
  })
  return `/?${params.toString()}`
}

export function recipientYearFromQuery(year: string | undefined, ref: string | undefined): {
  year: number | null
  fromSharePage: boolean
} {
  const parsed = Number(year)
  const whole = Number.isInteger(parsed) ? parsed : null
  return {
    year: whole,
    fromSharePage: ref === SHARE_PAGE_REF && whole != null,
  }
}

const AUTO_BUILD_REFS = new Set([SHARE_PAGE_REF, "class-of", "number-one-hits"])

/** Deep links from a share page, a class page, or a chart page build the playlist on arrival. */
export function shouldAutoBuild(ref: string | undefined, year: number | null): boolean {
  return year != null && ref != null && AUTO_BUILD_REFS.has(ref)
}
