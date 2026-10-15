export const STORY_WIDTH = 1080
export const STORY_HEIGHT = 1920
export const STORY_HIT_LIMIT = 20

/** Spread picks across years so a story card is not just the first year. */
export function pickStoryHits<T>(hits: readonly T[], yearOf: (hit: T) => number, limit = STORY_HIT_LIMIT): T[] {
  if (hits.length <= limit) return [...hits]
  const byYear = new Map<number, T[]>()
  for (const hit of hits) {
    const year = yearOf(hit)
    const group = byYear.get(year)
    if (group) group.push(hit)
    else byYear.set(year, [hit])
  }
  const years = [...byYear.keys()].sort((a, b) => a - b)
  const picked: T[] = []
  let round = 0
  while (picked.length < limit) {
    let added = false
    for (const year of years) {
      const hit = byYear.get(year)?.[round]
      if (!hit) continue
      picked.push(hit)
      added = true
      if (picked.length >= limit) break
    }
    if (!added) break
    round += 1
  }
  return picked
}
