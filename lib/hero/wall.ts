/** iTunes artwork URLs encode the pixel size. The hero wall asks for a small thumb. */
export function thumbnailCoverUrl(url: string, size = 100): string | null {
  if (!url.startsWith("https://")) return null
  const next = url.replace(/(\d+)x(\d+)(bb)?/i, `${size}x${size}$3`)
  try {
    const parsed = new URL(next)
    return parsed.protocol === "https:" ? parsed.toString() : null
  } catch {
    return null
  }
}

export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const next = [...items]
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1))
    const current = next[index]!
    next[index] = next[swap]!
    next[swap] = current
  }
  return next
}

/**
 * Spread catalog covers across the wall. Song ids follow the chart library,
 * so four bands stand in for early, middle, and late eras.
 */
export function mixEras(
  covers: readonly { id: number; src: string }[],
  bands = 4,
  random: () => number = Math.random,
): string[] {
  if (covers.length === 0 || bands < 1) return []
  const sorted = [...covers].sort((a, b) => a.id - b.id)
  const groups: string[][] = Array.from({ length: bands }, () => [])
  sorted.forEach((cover, index) => {
    const band = Math.min(bands - 1, Math.floor((index * bands) / sorted.length))
    groups[band]!.push(cover.src)
  })
  const shuffled = groups.map((group) => shuffle(group, random))
  const longest = shuffled.reduce((max, group) => Math.max(max, group.length), 0)
  const mixed: string[] = []
  for (let index = 0; index < longest; index += 1) {
    for (const group of shuffled) {
      const src = group[index]
      if (src) mixed.push(src)
    }
  }
  return mixed
}

export function dealWall(
  urls: readonly string[],
  count: number,
  random: () => number = Math.random,
): { tiles: string[]; spares: string[] } {
  const unique = [...new Set(urls)]
  const ordered = shuffle(unique, random)
  const tiles = ordered.slice(0, Math.max(0, count))
  return { tiles, spares: ordered.slice(tiles.length) }
}

export function wallTileCount(wide: boolean): number {
  return wide ? 40 : 12
}

/** Drift and crossfades stay off when the visitor asked for less motion, or the tab is hidden. */
export function wallMotionEnabled(reduceMotion: boolean, hidden: boolean): boolean {
  return !reduceMotion && !hidden
}
