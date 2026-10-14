"use client"

import { useEffect, useRef, useState } from "react"
import { drawCollage } from "@/components/cover-collage"
import { mapPool } from "@/lib/providers/batch"
import {
  APPLE_COVER_TIP,
  appleLibraryPlaylistName,
  libraryCoverFilename,
  libraryCoverPlan,
} from "@/lib/playlist/apple-library"
import { collageArtworkUrl } from "@/lib/playlist/collage"
import { hitKey } from "@/lib/playlist/hits"
import type { ChartHit, MatchedTrack } from "@/lib/playlist/types"

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

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError"
}

export function LibraryCover({
  graduationYear,
  startYear,
  endYear,
  hits,
  catalog,
  description,
}: {
  graduationYear: number
  startYear: number
  endYear: number
  hits: ChartHit[]
  catalog: Record<string, MatchedTrack | null>
  description: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [png, setPng] = useState<Blob | null>(null)
  const [note, setNote] = useState("Preparing your playlist cover.")
  const [busy, setBusy] = useState(false)
  const name = `Class of ${graduationYear}`

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
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
      const urls = [...new Set(entries.flatMap((entry) => (entry.artworkUrl ? [entry.artworkUrl] : [])))]
      const loaded = new Map<string, HTMLImageElement | null>()
      await mapPool(urls, 8, async (url) => {
        loaded.set(url, await loadImage(url))
      })
      if (cancelled || !canvas) return
      await document.fonts.ready
      if (cancelled) return
      const plan = libraryCoverPlan({
        graduationYear,
        startYear,
        endYear,
        hits: entries,
      })
      const titles = new Map(entries.map((entry) => [entry.key, entry.title]))
      const images = new Map(entries.map((entry) => [entry.key, entry.artworkUrl ? (loaded.get(entry.artworkUrl) ?? null) : null]))
      drawCollage(canvas, plan, titles, images, family)
      const blob = await canvasToPng(canvas)
      if (cancelled) return
      setPng(blob)
      setNote(blob ? "The cover is ready." : "The cover could not be prepared. Try again.")
    }

    void paint().catch(() => {
      if (!cancelled) setNote("The cover could not be prepared. Try again.")
    })
    return () => {
      cancelled = true
    }
  }, [catalog, endYear, graduationYear, hits, startYear])

  async function downloadCover() {
    if (!png || busy) return
    setBusy(true)
    const filename = libraryCoverFilename(graduationYear)
    const file = new File([png], filename, { type: "image/png" })
    const shareData: ShareData = { files: [file], title: name }
    const phone = window.matchMedia("(pointer: coarse)").matches
    try {
      if (phone && navigator.canShare?.(shareData)) {
        await navigator.share(shareData)
        return
      }
    } catch (error) {
      if (isAbort(error)) return
    } finally {
      setBusy(false)
    }
    const url = URL.createObjectURL(png)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1500)
  }

  return (
    <div className="save-cover" data-save-cover data-save-ready={png ? "1" : "0"}>
      <div className="save-cover-stage">
        <canvas ref={canvasRef} role="img" aria-label={`${name} playlist cover`} />
      </div>
      <p className="save-cover-name">{appleLibraryPlaylistName(graduationYear)}</p>
      <p className="quiet save-cover-description">{description}</p>
      <button type="button" className="btn btn-ink" disabled={!png || busy} onClick={() => void downloadCover()}>
        Download your playlist cover
      </button>
      <p className="save-cover-tip">{APPLE_COVER_TIP}</p>
      <p role="status" className="sr-only">
        {note}
      </p>
    </div>
  )
}
