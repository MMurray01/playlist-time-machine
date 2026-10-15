import { STORY_HEIGHT, STORY_WIDTH } from "@/lib/share/story"

export interface StoryTile {
  title: string
  artworkUrl: string | null
}

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image()
    image.crossOrigin = "anonymous"
    image.decoding = "async"
    image.onload = () => resolve(image)
    image.onerror = () => resolve(null)
    image.src = url
  })
}

function roundedClip(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const radius = Math.min(18, size * 0.08)
  ctx.beginPath()
  if (typeof ctx.roundRect === "function") ctx.roundRect(x, y, size, size, radius)
  else ctx.rect(x, y, size, size)
}

function initials(title: string): string {
  const letters = title
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("")
  return letters || "1"
}

function wrapLine(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ""
  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (ctx.measureText(next).width > maxWidth && current) {
      lines.push(current)
      current = word
    } else {
      current = next
    }
  }
  if (current) lines.push(current)
  return lines
}

/** 1080x1920 story card. Covers fill the frame and the words sit in the center. */
export async function renderStoryPng(input: {
  title: string
  tagline: string
  mark: string
  tiles: StoryTile[]
}): Promise<Blob | null> {
  const canvas = document.createElement("canvas")
  canvas.width = STORY_WIDTH
  canvas.height = STORY_HEIGHT
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  ctx.fillStyle = "#0c0814"
  ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT)

  const tiles = input.tiles.slice(0, 24)
  const images = await Promise.all(tiles.map((tile) => (tile.artworkUrl ? loadImage(tile.artworkUrl) : Promise.resolve(null))))
  const cols = tiles.length > 15 ? 4 : 3
  const rows = Math.max(1, Math.ceil(tiles.length / cols))
  const gap = 14
  const pad = 36
  const cell = Math.floor((STORY_WIDTH - pad * 2 - gap * (cols - 1)) / cols)
  const gridHeight = rows * cell + gap * Math.max(0, rows - 1)
  const offsetY = Math.max(pad, Math.round((STORY_HEIGHT - gridHeight) / 2))
  const gridWidth = cols * cell + gap * (cols - 1)
  const offsetX = Math.round((STORY_WIDTH - gridWidth) / 2)

  tiles.forEach((tile, index) => {
    const col = index % cols
    const row = Math.floor(index / cols)
    const x = offsetX + col * (cell + gap)
    const y = offsetY + row * (cell + gap)
    const image = images[index]
    ctx.save()
    roundedClip(ctx, x, y, cell)
    ctx.clip()
    if (image && image.naturalWidth > 0) {
      const scale = Math.max(cell / image.naturalWidth, cell / image.naturalHeight)
      const width = image.naturalWidth * scale
      const height = image.naturalHeight * scale
      ctx.drawImage(image, x + (cell - width) / 2, y + (cell - height) / 2, width, height)
    } else {
      ctx.fillStyle = "#2a2433"
      ctx.fillRect(x, y, cell, cell)
      ctx.fillStyle = "#f6f6f7"
      ctx.font = `600 ${Math.round(cell * 0.22)}px Inter, sans-serif`
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(initials(tile.title), x + cell / 2, y + cell / 2)
    }
    ctx.restore()
  })

  const glow = ctx.createRadialGradient(STORY_WIDTH / 2, STORY_HEIGHT / 2, 40, STORY_WIDTH / 2, STORY_HEIGHT / 2, STORY_HEIGHT * 0.48)
  glow.addColorStop(0, "rgba(8,5,16,0.86)")
  glow.addColorStop(0.42, "rgba(8,5,16,0.62)")
  glow.addColorStop(1, "rgba(8,5,16,0.18)")
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT)

  const family = getComputedStyle(document.body).fontFamily || "Inter, sans-serif"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillStyle = "#fffdf8"
  ctx.font = `700 86px ${family}`
  const titleWidth = ctx.measureText(input.title).width
  const titleSize = titleWidth > STORY_WIDTH - 120 ? 68 : 86
  ctx.font = `700 ${titleSize}px ${family}`
  ctx.fillText(input.title, STORY_WIDTH / 2, STORY_HEIGHT / 2 - 28)

  ctx.fillStyle = "rgba(244,241,234,0.94)"
  ctx.font = `500 36px ${family}`
  const lines = wrapLine(ctx, input.tagline, STORY_WIDTH - 160)
  lines.forEach((line, index) => {
    ctx.fillText(line, STORY_WIDTH / 2, STORY_HEIGHT / 2 + 48 + index * 48)
  })

  ctx.fillStyle = "rgba(244,241,234,0.8)"
  ctx.font = `500 28px ${family}`
  ctx.fillText(input.mark, STORY_WIDTH / 2, STORY_HEIGHT / 2 + 48 + lines.length * 48 + 28)

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png")
  })
}
