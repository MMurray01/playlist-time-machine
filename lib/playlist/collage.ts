/**
 * Album-cover collage geometry and share text.
 * Artwork bytes are loaded from Apple by the browser for the picture the
 * visitor downloads. This module does not fetch, store, or cache those files.
 */

export const COLLAGE_FORMATS = {
  square: { width: 1080, height: 1080, label: "Square" },
  wallpaper: { width: 1080, height: 1920, label: "Phone wallpaper" },
} as const

export type CollageFormat = keyof typeof COLLAGE_FORMATS
export type CollageLayout = "grid" | "mosaic"

export const COLLAGE_MARK = "playlisttimemachine.com"
export const COLLAGE_ART_SIZE = 320

const EDGE = 54
const GAP = 8

export interface CollageSource {
  key: string
  year: number
  weeks: number
}

export interface CollageTile {
  key: string
  x: number
  y: number
  size: number
  hero: boolean
}

export interface CollageBox {
  x: number
  y: number
  width: number
  height: number
}

export interface CollagePlan {
  format: CollageFormat
  layout: CollageLayout
  width: number
  height: number
  headline: string
  mark: string
  titleSize: number
  markSize: number
  art: CollageBox
  tiles: CollageTile[]
  heroKeys: string[]
}

export function collageHeadline(title: string, startYear: number, endYear: number): string {
  const name = title.replace(/\s+/g, " ").trim() || "Playlist"
  return `${name} \u00b7 ${startYear}\u2013${endYear}`
}

export function collageInviteText(headline: string): string {
  return `${headline}. A free cover collage. Make your own.`
}

export function collageInviteUrl(pageUrl: string, origin = "https://playlisttimemachine.com"): string {
  const url = new URL(pageUrl, origin)
  url.searchParams.set("collage", "1")
  url.hash = ""
  return url.toString()
}

export function collageSharePlan(headline: string, pageUrl: string, origin?: string): {
  inviteUrl: string
  text: string
  fileText: string
} {
  const inviteUrl = collageInviteUrl(pageUrl, origin)
  const text = collageInviteText(headline)
  return { inviteUrl, text, fileText: `${text} ${inviteUrl}` }
}

export function collageDownloadName(title: string, format: CollageFormat): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
  return `${base || "playlist"}-${format}.png`
}

export function collageDescription(input: {
  headline: string
  count: number
  format: CollageFormat
  layout: CollageLayout
  heroCount: number
}): string {
  const shape = input.format === "square" ? "square, 1080 by 1080" : "phone wallpaper, 1080 by 1920"
  const arrangement =
    input.layout === "grid"
      ? "an even grid"
      : `a mosaic with ${input.heroCount} larger ${input.heroCount === 1 ? "cover" : "covers"} for each year's biggest hit`
  const covers = input.count === 1 ? "1 album cover" : `${input.count} album covers`
  return `${input.headline}. ${covers} in ${arrangement}. ${shape}. Free to download.`
}

export function coverInitials(title: string): string {
  const letters = title
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("")
  return letters || "1"
}

export function isAppleArtworkUrl(value: string): boolean {
  try {
    const url = new URL(value)
    if (url.protocol !== "https:") return false
    const host = url.hostname.toLowerCase()
    return host === "mzstatic.com" || host.endsWith(".mzstatic.com") || host === "apple.com" || host.endsWith(".apple.com")
  } catch {
    return false
  }
}

/** Point an Apple artwork URL at a modest size. The host stays Apple's CDN. */
export function collageArtworkUrl(value: string | null | undefined, size = COLLAGE_ART_SIZE): string | null {
  if (!value || !isAppleArtworkUrl(value)) return null
  return value.replace(/(\d+)x(\d+)(bb)?(?=\.(?:jpg|jpeg|png|webp)\b)/i, `${size}x${size}$3`)
}

/** One cover per year: the longest run. Ties keep the earlier song. */
export function mosaicHeroKeys(hits: readonly CollageSource[]): string[] {
  const best = new Map<number, CollageSource>()
  for (const hit of hits) {
    const current = best.get(hit.year)
    if (!current || hit.weeks > current.weeks) best.set(hit.year, hit)
  }
  return [...best.values()].map((hit) => hit.key)
}

function frame(format: CollageFormat): { width: number; height: number; art: CollageBox; titleSize: number } {
  const { width, height } = COLLAGE_FORMATS[format]
  const titleBand = format === "wallpaper" ? 156 : 124
  const footer = 78
  return {
    width,
    height,
    titleSize: format === "wallpaper" ? 64 : 52,
    art: {
      x: EDGE,
      y: titleBand,
      width: width - EDGE * 2,
      height: height - titleBand - footer,
    },
  }
}

interface Placed {
  key: string
  col: number
  row: number
  span: 1 | 2
}

function packSpans(items: { key: string; span: 1 | 2 }[], cols: number): { placed: Placed[]; rows: number; cols: number } {
  const occupied: boolean[][] = []
  const placed: Placed[] = []

  function fits(col: number, row: number, span: number): boolean {
    if (col < 0 || row < 0 || col + span > cols) return false
    for (let y = row; y < row + span; y += 1) {
      for (let x = col; x < col + span; x += 1) {
        if (occupied[y]?.[x]) return false
      }
    }
    return true
  }

  function take(col: number, row: number, span: number) {
    for (let y = row; y < row + span; y += 1) {
      if (!occupied[y]) occupied[y] = Array(cols).fill(false)
      for (let x = col; x < col + span; x += 1) occupied[y]![x] = true
    }
  }

  for (const item of items) {
    let found = false
    const limit = items.length * 4 + 4
    for (let row = 0; row < limit && !found; row += 1) {
      for (let col = 0; col <= cols - item.span; col += 1) {
        if (!fits(col, row, item.span)) continue
        take(col, row, item.span)
        placed.push({ key: item.key, col, row, span: item.span })
        found = true
        break
      }
    }
    if (!found) return { placed: [], rows: 0, cols }
  }

  return { placed, rows: occupied.length, cols }
}

function choosePack(
  items: { key: string; span: 1 | 2 }[],
  art: CollageBox,
): { placed: Placed[]; cell: number; cols: number; rows: number } {
  let best: { placed: Placed[]; cell: number; cols: number; rows: number; score: number } | null = null
  const minCols = items.some((item) => item.span === 2) ? 2 : 1
  const maxCols = Math.max(minCols, Math.min(items.length, 36))
  for (let cols = minCols; cols <= maxCols; cols += 1) {
    const packed = packSpans(items, cols)
    if (packed.placed.length !== items.length || packed.rows < 1) continue
    const cellW = (art.width - GAP * (cols - 1)) / cols
    const cellH = (art.height - GAP * (packed.rows - 1)) / packed.rows
    const cell = Math.min(cellW, cellH)
    if (cell < 8) continue
    const usedW = cols * cell + GAP * (cols - 1)
    const usedH = packed.rows * cell + GAP * (packed.rows - 1)
    const fill = (usedW * usedH) / (art.width * art.height)
    const score = cell + fill * 12
    if (!best || score > best.score) best = { placed: packed.placed, cell, cols, rows: packed.rows, score }
  }
  if (!best) throw new Error("The collage could not be arranged")
  return best
}

function tilesFrom(pack: { placed: Placed[]; cell: number; cols: number; rows: number }, art: CollageBox, heroes: Set<string>): CollageTile[] {
  const { cell, cols, rows, placed } = pack
  const usedW = cols * cell + GAP * (cols - 1)
  const usedH = rows * cell + GAP * (rows - 1)
  const offsetX = art.x + (art.width - usedW) / 2
  const offsetY = art.y + (art.height - usedH) / 2
  return placed.map((item) => ({
    key: item.key,
    x: offsetX + item.col * (cell + GAP),
    y: offsetY + item.row * (cell + GAP),
    size: item.span * cell + (item.span - 1) * GAP,
    hero: heroes.has(item.key),
  }))
}

function gridItems(hits: readonly CollageSource[]): { key: string; span: 1 | 2 }[] {
  return hits.map((hit) => ({ key: hit.key, span: 1 as const }))
}

function mosaicItems(hits: readonly CollageSource[], heroes: Set<string>): { key: string; span: 1 | 2 }[] {
  const byYear = new Map<number, CollageSource[]>()
  for (const hit of hits) {
    const group = byYear.get(hit.year)
    if (group) group.push(hit)
    else byYear.set(hit.year, [hit])
  }
  const items: { key: string; span: 1 | 2 }[] = []
  for (const year of [...byYear.keys()].sort((a, b) => a - b)) {
    const group = byYear.get(year) ?? []
    const ordered = [...group.filter((hit) => heroes.has(hit.key)), ...group.filter((hit) => !heroes.has(hit.key))]
    for (const hit of ordered) items.push({ key: hit.key, span: heroes.has(hit.key) ? 2 : 1 })
  }
  return items
}

export function planCollage(input: {
  format: CollageFormat
  layout: CollageLayout
  title: string
  startYear: number
  endYear: number
  hits: readonly CollageSource[]
}): CollagePlan {
  const box = frame(input.format)
  const heroKeys = input.layout === "mosaic" ? mosaicHeroKeys(input.hits) : []
  const heroes = new Set(heroKeys)
  const items = input.layout === "mosaic" ? mosaicItems(input.hits, heroes) : gridItems(input.hits)
  const tiles = items.length === 0 ? [] : tilesFrom(choosePack(items, box.art), box.art, heroes)
  return {
    format: input.format,
    layout: input.layout,
    width: box.width,
    height: box.height,
    headline: collageHeadline(input.title, input.startYear, input.endYear),
    mark: COLLAGE_MARK,
    titleSize: box.titleSize,
    markSize: 22,
    art: box.art,
    tiles,
    heroKeys,
  }
}
