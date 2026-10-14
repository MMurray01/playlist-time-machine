import type { CatalogCandidate } from "@/lib/playlist/types"

const ALTERNATE =
  /\b(remix|live|karaoke|instrumental|cover|tribute|nightcore|sped up|slowed)\b/i

/** Words that show up on catalog titles and not on the chart line. */
const TITLE_FILLER = new Set([
  "medley",
  "version",
  "versions",
  "single",
  "original",
  "remaster",
  "remastered",
  "radio",
  "edit",
  "album",
  "soundtrack",
  "mono",
  "stereo",
  "inch",
  "side",
  "pt",
  "part",
  "the",
])

const ROMAN_PART: Record<string, string> = { i: "1", ii: "2", iii: "3", iv: "4", v: "5" }

export function normalizeMusicText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/\b(feat|featuring|ft)\.?\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
}

export function coreTitle(value: string): string {
  return normalizeMusicText(value.replace(/\([^)]*\)|\[[^\]]*\]/g, " "))
}

function partNumber(token: string): string | null {
  if (/^\d+$/.test(token)) return String(Number(token))
  return ROMAN_PART[token] ?? null
}

function comparableTitle(value: string): { tokens: string; part: string | null } {
  const raw = coreTitle(value).split(" ").filter(Boolean)
  const tokens: string[] = []
  let part: string | null = null
  for (let index = 0; index < raw.length; index++) {
    const token = raw[index] ?? ""
    const next = raw[index + 1]
    if ((token === "pt" || token === "part") && next && partNumber(next)) {
      part = partNumber(next)
      index += 1
      continue
    }
    if (/^\d+$/.test(token) && next === "inch") {
      index += 1
      continue
    }
    if (TITLE_FILLER.has(token) || token.length <= 1) continue
    tokens.push(token)
  }
  return { tokens: tokens.join(" "), part }
}

/**
 * Titles agree when the chart line and the catalog line are the same song.
 * Parentheses, filler such as "remaster" or "medley", and a missing part
 * number are ignored. A short title does not match a longer different one,
 * and Pt. 1 does not match Pt. 2.
 */
export function titlesAgree(hitTitle: string, candidateTitle: string): boolean {
  const hitCore = coreTitle(hitTitle)
  const candidateCore = coreTitle(candidateTitle)
  if (hitCore && hitCore === candidateCore) return true

  const hit = comparableTitle(hitTitle)
  const candidate = comparableTitle(candidateTitle)
  if (!hit.tokens || hit.tokens !== candidate.tokens) return false
  if (hit.part && candidate.part && hit.part !== candidate.part) return false
  return true
}

function significantTokens(value: string): string[] {
  return normalizeMusicText(value)
    .split(" ")
    .filter((token) => token.length > 1 && token !== "and" && token !== "the")
}

export function artistMatches(hitArtist: string, candidateArtist: string): boolean {
  const hit = normalizeMusicText(hitArtist)
  const candidate = normalizeMusicText(candidateArtist)
  if (hit && hit === candidate) return true

  const hitTokens = significantTokens(hitArtist)
  const candidateTokens = significantTokens(candidateArtist)
  if (hitTokens.length === 0 || candidateTokens.length === 0) return false

  const hitSet = new Set(hitTokens)
  const candidateSet = new Set(candidateTokens)
  const hitInCandidate = hitTokens.every((token) => candidateSet.has(token))
  const candidateInHit = candidateTokens.every((token) => hitSet.has(token))
  return hitInCandidate || candidateInHit
}

function primaryArtist(artist: string): string {
  const head = artist.split(/\s+(?:&|and|with|featuring|feat\.?|ft\.?|x)\s+/i)[0]?.trim() || artist.trim()
  const withoutArticle = head.replace(/^the\s+/i, "").trim()
  return withoutArticle || head
}

function bareTitle(title: string): string {
  return title
    .replace(/\([^)]*\)|\[[^\]]*\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/** Up to three catalog searches, from the most specific title and artist to the title alone. */
export function searchQueries(hit: { title: string; artist: string }): string[] {
  const queries: string[] = []
  const push = (value: string) => {
    const term = value.replace(/\s+/g, " ").trim()
    if (!term || queries.includes(term) || queries.length >= 3) return
    queries.push(term)
  }
  push(`${hit.title} ${hit.artist}`)
  push(`${bareTitle(hit.title)} ${primaryArtist(hit.artist)}`)
  push(bareTitle(hit.title))
  return queries
}

/**
 * Pick a catalog recording only when the title and artist agree.
 * Remixes, live cuts, and karaoke versions are skipped unless the chart
 * title itself is one of those. Among matches, a cover and a preview win.
 */
export function chooseCatalogMatch(
  hit: { title: string; artist: string },
  candidates: CatalogCandidate[],
): CatalogCandidate | null {
  if (!coreTitle(hit.title)) return null
  const hitIsAlternate = ALTERNATE.test(hit.title)
  let best: { candidate: CatalogCandidate; score: number } | null = null

  for (const candidate of candidates) {
    if (!candidate.id || !candidate.title) continue
    if (!hitIsAlternate && ALTERNATE.test(candidate.title)) continue
    if (!titlesAgree(hit.title, candidate.title)) continue
    if (!artistMatches(hit.artist, candidate.artist)) continue

    const exactTitle = normalizeMusicText(hit.title) === normalizeMusicText(candidate.title)
    const exactArtist = normalizeMusicText(hit.artist) === normalizeMusicText(candidate.artist)
    const media = (candidate.artworkUrl ? 1 : 0) + (candidate.previewUrl ? 1 : 0)
    const score = media * 10 + (exactTitle ? 2 : 0) + (exactArtist ? 1 : 0)
    if (!best || score > best.score) {
      best = { candidate, score }
    }
  }

  // A later name or a different billing (Wham! / George Michael) can still be
  // the same recording. Accept it only when the title itself is distinctive
  // and no artist-matching row was found. Catalog order breaks ties.
  if (!best && distinctiveTitle(hit.title)) {
    for (const candidate of candidates) {
      if (!candidate.id || !candidate.title) continue
      if (!hitIsAlternate && ALTERNATE.test(candidate.title)) continue
      if (coreTitle(candidate.title) !== coreTitle(hit.title)) continue
      const media = (candidate.artworkUrl ? 1 : 0) + (candidate.previewUrl ? 1 : 0)
      if (!best || media > best.score) best = { candidate, score: media }
    }
  }

  return best?.candidate ?? null
}

function distinctiveTitle(title: string): boolean {
  return comparableTitle(title).tokens.split(" ").filter(Boolean).length >= 2
}
