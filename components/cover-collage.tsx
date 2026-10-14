"use client"

import { useEffect, useRef, useState } from "react"
import { mapPool } from "@/lib/providers/batch"
import {
  collageArtworkUrl,
  collageDescription,
  collageDownloadName,
  collageHeadline,
  collageSharePlan,
  coverInitials,
  planCollage,
  type CollageFormat,
  type CollageLayout,
  type CollagePlan,
} from "@/lib/playlist/collage"
import { tokens } from "@/lib/playlist/tokens"
import type { ChartHit, MatchedTrack } from "@/lib/playlist/types"
import { hitKey } from "@/lib/playlist/hits"

type ShareResult = "file" | "link" | "copied" | "cancelled" | "failed"

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

function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png")
  })
}

function roundedClip(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const radius = Math.min(12, size * 0.08)
  ctx.beginPath()
  if (typeof ctx.roundRect === "function") ctx.roundRect(x, y, size, size, radius)
  else ctx.rect(x, y, size, size)
}

function drawTile(
  ctx: CanvasRenderingContext2D,
  tile: { x: number; y: number; size: number },
  title: string,
  image: HTMLImageElement | null | undefined,
  family: string,
) {
  ctx.save()
  roundedClip(ctx, tile.x, tile.y, tile.size)
  ctx.clip()
  if (image && image.naturalWidth > 0) {
    const scale = Math.max(tile.size / image.naturalWidth, tile.size / image.naturalHeight)
    const width = image.naturalWidth * scale
    const height = image.naturalHeight * scale
    ctx.drawImage(image, tile.x + (tile.size - width) / 2, tile.y + (tile.size - height) / 2, width, height)
  } else {
    ctx.fillStyle = tokens.cover
    ctx.fillRect(tile.x, tile.y, tile.size, tile.size)
    ctx.fillStyle = tokens.coverInk
    ctx.font = `600 ${Math.max(12, Math.round(tile.size * 0.22))}px ${family}`
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(coverInitials(title), tile.x + tile.size / 2, tile.y + tile.size / 2)
  }
  ctx.restore()
}

function fitTitle(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, size: number, family: string): string {
  let current = size
  const spaced = ctx as CanvasRenderingContext2D & { letterSpacing?: string }
  const apply = (next: number) => {
    ctx.font = `600 ${next}px ${family}`
    spaced.letterSpacing = "-0.03em"
  }
  apply(current)
  while (current > 28 && ctx.measureText(text).width > maxWidth) {
    current -= 2
    apply(current)
  }
  if (ctx.measureText(text).width <= maxWidth) return text
  let clipped = text
  while (clipped.length > 1 && ctx.measureText(`${clipped}…`).width > maxWidth) clipped = clipped.slice(0, -1)
  return `${clipped}…`
}

export function drawCollage(
  canvas: HTMLCanvasElement,
  plan: CollagePlan,
  titles: Map<string, string>,
  images: Map<string, HTMLImageElement | null>,
  family: string,
) {
  canvas.width = plan.width
  canvas.height = plan.height
  const ctx = canvas.getContext("2d")
  if (!ctx) return
  ctx.fillStyle = tokens.paper
  ctx.fillRect(0, 0, plan.width, plan.height)
  const title = fitTitle(ctx, plan.headline, plan.width - 108, plan.titleSize, family)
  ctx.fillStyle = tokens.ink
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(title, plan.width / 2, plan.art.y / 2)
  for (const tile of plan.tiles) {
    const art = images.get(tile.key)
    drawTile(ctx, tile, titles.get(tile.key) ?? "", art, family)
  }
  ctx.fillStyle = tokens.inkSoft
  ctx.font = `500 ${plan.markSize}px ${family}`
  ;(ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = "0.01em"
  ctx.textAlign = "right"
  ctx.textBaseline = "middle"
  ctx.fillText(plan.mark, plan.width - 54, plan.height - 39)
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError"
}

export function CoverCollage({
  hits,
  title,
  startYear,
  endYear,
  catalog,
  onRequestCovers,
  onEnsureShareUrl,
  onClose,
}: {
  hits: ChartHit[]
  title: string
  startYear: number
  endYear: number
  catalog: Record<string, MatchedTrack | null>
  onRequestCovers: (hits: ChartHit[]) => void
  onEnsureShareUrl: () => Promise<string | null>
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const images = useRef(new Map<string, HTMLImageElement | null>())
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const requestRef = useRef(onRequestCovers)
  requestRef.current = onRequestCovers
  const openedAt = useRef(typeof performance !== "undefined" ? performance.now() : 0)
  const [format, setFormat] = useState<CollageFormat>("square")
  const [layout, setLayout] = useState<CollageLayout>("grid")
  const [png, setPng] = useState<Blob | null>(null)
  const [status, setStatus] = useState("Gathering album covers.")
  const [shareNote, setShareNote] = useState("")
  const [fileShare, setFileShare] = useState(false)
  const [linkShare, setLinkShare] = useState(false)
  const [timing, setTiming] = useState<{ loadMs: number; pngMs: number; openMs: number | null } | null>(null)
  const [sharing, setSharing] = useState(false)
  const firstReady = useRef<{ loadMs: number; openMs: number | null } | null>(null)

  useEffect(() => {
    requestRef.current(hits)
    const timer = window.setInterval(() => requestRef.current(hits), 5000)
    return () => window.clearInterval(timer)
  }, [hits])

  useEffect(() => {
    setLinkShare(typeof navigator.share === "function")
    try {
      const sample = new File([new Uint8Array([1])], "collage.png", { type: "image/png" })
      setFileShare(Boolean(navigator.canShare?.({ files: [sample] })))
    } catch {
      setFileShare(false)
    }
  }, [])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const onNativeClose = () => {
      const pending = Number(dialog.dataset.suppressClose || 0)
      if (pending > 0) {
        if (pending === 1) delete dialog.dataset.suppressClose
        else dialog.dataset.suppressClose = String(pending - 1)
        return
      }
      onCloseRef.current()
    }
    dialog.addEventListener("close", onNativeClose)
    if (!dialog.open) dialog.showModal()
    return () => {
      dialog.removeEventListener("close", onNativeClose)
      if (dialog.open) {
        dialog.dataset.suppressClose = String(Number(dialog.dataset.suppressClose || 0) + 1)
        dialog.close()
      }
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const surface: HTMLCanvasElement = canvas
    let cancelled = false
    const family = getComputedStyle(document.body).fontFamily || "sans-serif"
    const entries = hits.map((hit) => {
      const key = hitKey(hit)
      const match = catalog[key]
      return {
        key,
        year: hit.year,
        weeks: hit.weeksAtNumberOne != null && hit.weeksAtNumberOne > 0 ? hit.weeksAtNumberOne : 0,
        title: hit.title,
        artworkUrl: collageArtworkUrl(match?.artworkLargeUrl || match?.artworkUrl || null),
      }
    })

    async function paint() {
      try {
      const urls = [...new Set(entries.flatMap((entry) => (entry.artworkUrl ? [entry.artworkUrl] : [])))]
      const missing = urls.filter((url) => !images.current.has(url))
      if (missing.length > 0) {
        await mapPool(missing, 8, async (url) => {
          const image = await loadImage(url)
          images.current.set(url, image)
        })
      }
      if (cancelled) return
      await document.fonts.ready
      if (cancelled) return
      const plan = planCollage({
        format,
        layout,
        title,
        startYear,
        endYear,
        hits: entries,
      })
      const titles = new Map(entries.map((entry) => [entry.key, entry.title]))
      const drawn = new Map<string, HTMLImageElement | null>()
      for (const entry of entries) {
        drawn.set(entry.key, entry.artworkUrl ? (images.current.get(entry.artworkUrl) ?? null) : null)
      }
      drawCollage(surface, plan, titles, drawn, family)
      const lookupDone = hits.every((hit) => hitKey(hit) in catalog)
      const artTried = urls.every((url) => images.current.has(url))
      if (!lookupDone || !artTried) {
        setPng(null)
        setTiming(null)
        const found = hits.filter((hit) => hitKey(hit) in catalog).length
        setStatus(`Gathering album covers. ${found} of ${hits.length}.`)
        return
      }
      const encodeStarted = performance.now()
      const blob = await canvasToPng(surface)
      if (cancelled) return
      const pngMs = Math.round(performance.now() - encodeStarted)
      if (!firstReady.current) {
        const openMark = performance.getEntriesByName("collage-open").at(-1)
        firstReady.current = {
          loadMs: Math.round(performance.now() - openedAt.current),
          openMs: openMark ? Math.round(openMark.startTime > 0 ? performance.now() - openMark.startTime : 0) : null,
        }
      }
      setPng(blob)
      setTiming({ loadMs: firstReady.current.loadMs, pngMs, openMs: firstReady.current.openMs })
      setStatus(blob ? "The picture is ready." : "The picture could not be saved. Try again.")
      } catch {
        if (!cancelled) setStatus("The collage could not be arranged. Try again.")
      }
    }

    void paint()
    return () => {
      cancelled = true
    }
  }, [catalog, endYear, format, hits, layout, startYear, title])

  const headline = collageHeadline(title, startYear, endYear)
  const heroCount = layout === "mosaic" ? new Set(hits.map((hit) => hit.year)).size : 0
  const description = collageDescription({
    headline,
    count: hits.length,
    format,
    layout,
    heroCount,
  })

  function chooseFormat(next: CollageFormat) {
    if (next === format) return
    setPng(null)
    setStatus("Updating the picture.")
    setFormat(next)
  }

  function chooseLayout(next: CollageLayout) {
    if (next === layout) return
    setPng(null)
    setStatus("Updating the picture.")
    setLayout(next)
  }

  function download() {
    if (!png) return
    const url = URL.createObjectURL(png)
    const link = document.createElement("a")
    link.href = url
    link.download = collageDownloadName(title, format)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1500)
  }

  async function share(): Promise<ShareResult> {
    if (!png || sharing) return "failed"
    setSharing(true)
    setShareNote("")
    try {
      const pageUrl = await onEnsureShareUrl()
      if (!pageUrl) {
        setShareNote("The share link could not be saved. You can still download the picture.")
        return "failed"
      }
      const plan = collageSharePlan(headline, pageUrl)
      const file = new File([png], collageDownloadName(title, format), { type: "image/png" })
      const attempts: ShareData[] = []
      if (typeof navigator.share === "function") {
        attempts.push({ files: [file], title: headline, text: plan.fileText })
        attempts.push({ files: [file], title: headline, text: plan.text, url: plan.inviteUrl })
        attempts.push({ title: headline, text: plan.text, url: plan.inviteUrl })
      }
      for (const attempt of attempts) {
        if (navigator.canShare && !navigator.canShare(attempt)) continue
        try {
          await navigator.share(attempt)
          setShareNote(attempt.files ? "Shared with a link back to this playlist." : "Shared the link.")
          return attempt.files ? "file" : "link"
        } catch (error) {
          if (isAbort(error)) return "cancelled"
        }
      }
      await navigator.clipboard.writeText(plan.fileText)
      setShareNote("Invite link copied.")
      return "copied"
    } catch {
      setShareNote("The collage could not be shared. You can still download the picture.")
      return "failed"
    } finally {
      setSharing(false)
    }
  }

  const shareLabel = fileShare ? "Share" : linkShare ? "Share link" : "Copy invite link"
  const timingLabel =
    timing && png
      ? `Covers and picture ready in ${(timing.loadMs / 1000).toFixed(1)}s. PNG encoded in ${timing.pngMs}ms.`
      : ""

  return (
    <dialog
      ref={dialogRef}
      className="collage-dialog"
      aria-labelledby="collage-title"
      aria-busy={png ? undefined : true}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose()
      }}
    >
      <div className="collage-dialog-body">
        <h2 id="collage-title">Cover collage</h2>
        <p className="collage-headline">{headline}</p>
        <p id="collage-description" className="sr-only">
          {description}
        </p>
        <div className={`collage-stage ${format === "wallpaper" ? "is-wallpaper" : "is-square"}`}>
          <canvas ref={canvasRef} role="img" aria-labelledby="collage-description" className="collage-preview" />
        </div>
        <p role="status" aria-live="polite" className="quiet collage-status" data-collage-ready={png ? "1" : "0"} data-load-ms={timing?.loadMs ?? ""} data-png-ms={timing?.pngMs ?? ""} data-open-ms={timing?.openMs ?? ""} data-format={format} data-layout={layout}>
          {status}
          {timingLabel ? ` ${timingLabel}` : ""}
        </p>
        <div className="collage-choices" role="group" aria-label="Collage shape">
          <button type="button" className="chip" aria-pressed={format === "square"} onClick={() => chooseFormat("square")}>
            Square, 1080 by 1080
          </button>
          <button type="button" className="chip" aria-pressed={format === "wallpaper"} onClick={() => chooseFormat("wallpaper")}>
            Phone wallpaper, 1080 by 1920
          </button>
        </div>
        <div className="collage-choices" role="group" aria-label="Collage layout">
          <button type="button" className="chip" aria-pressed={layout === "grid"} onClick={() => chooseLayout("grid")}>
            Grid
          </button>
          <button type="button" className="chip" aria-pressed={layout === "mosaic"} onClick={() => chooseLayout("mosaic")}>
            Mosaic
          </button>
        </div>
        <p className="quiet collage-note">Free to download. Album covers come from Apple for this picture and are not stored here. Not for sale.</p>
        {shareNote ? (
          <p role="status" className="quiet">
            {shareNote}
          </p>
        ) : null}
      </div>
      <div className="collage-dialog-actions">
        <button type="button" className="btn btn-accent" onClick={download} disabled={!png || sharing}>
          Download PNG
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => void share()} disabled={!png || sharing}>
          {shareLabel}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Close
        </button>
      </div>
    </dialog>
  )
}
