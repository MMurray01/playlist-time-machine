import type { CatalogCandidate } from "@/lib/playlist/types"

const ALTERNATE =
  /\b(remix|live|karaoke|instrumental|cover|tribute|nightcore|sped up|slowed)\b/i

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

function significantTokens(value: string): string[] {
  return normalizeMusicText(value)
    .split(" ")
    .filter((token) => token.length > 1 && token !== "and")
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

/**
 * Pick a catalog recording only when the title core and artist agree.
 * Remixes, live cuts, and karaoke versions are skipped unless the chart
 * title itself is one of those.
 */
export function chooseCatalogMatch(
  hit: { title: string; artist: string },
  candidates: CatalogCandidate[],
): CatalogCandidate | null {
  const hitCore = coreTitle(hit.title)
  if (!hitCore) return null
  const hitIsAlternate = ALTERNATE.test(hit.title)
  let best: { candidate: CatalogCandidate; score: number } | null = null

  for (const candidate of candidates) {
    if (!candidate.id || !candidate.title) continue
    if (!hitIsAlternate && ALTERNATE.test(candidate.title)) continue
    if (coreTitle(candidate.title) !== hitCore) continue
    if (!artistMatches(hit.artist, candidate.artist)) continue

    const exactTitle = normalizeMusicText(hit.title) === normalizeMusicText(candidate.title)
    const exactArtist = normalizeMusicText(hit.artist) === normalizeMusicText(candidate.artist)
    const score = (exactTitle ? 2 : 0) + (exactArtist ? 1 : 0)
    if (!best || score > best.score) {
      best = { candidate, score }
    }
  }

  return best?.candidate ?? null
}
