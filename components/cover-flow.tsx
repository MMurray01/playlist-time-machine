"use client"

import { useEffect, useRef, useState } from "react"
import { AppleMusicBadge } from "@/components/apple-badge"
import type { AffiliatePlacement } from "@/lib/affiliate"
import { hitKey } from "@/lib/playlist/hits"
import type { ChartHit, MatchedTrack } from "@/lib/playlist/types"

export function CoverFlow({
  year,
  hits,
  catalog,
  brokenArt,
  playingKey,
  onTogglePlay,
  onBroken,
  onNeed,
  affiliateToken,
  placement,
  priority = false,
}: {
  year: number
  hits: ChartHit[]
  catalog: Record<string, MatchedTrack | null>
  brokenArt: Record<string, true>
  playingKey: string | null
  onTogglePlay: (hit: ChartHit) => void
  onBroken: (key: string) => void
  onNeed: (hits: ChartHit[]) => void
  affiliateToken: string | null
  placement: AffiliatePlacement
  priority?: boolean
}) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const indexRef = useRef(0)
  const frame = useRef<number | null>(null)
  const lock = useRef(0)
  const safeIndex = Math.min(index, Math.max(hits.length - 1, 0))
  const current = hits[safeIndex] ?? hits[0]
  const currentKey = current ? hitKey(current) : ""

  function scrollTo(next: number) {
    const scroller = scrollerRef.current
    const slide = scroller?.querySelectorAll<HTMLElement>("[data-flow-slide]")[next]
    if (!scroller || !slide) return
    const left = slide.offsetLeft - (scroller.clientWidth - slide.offsetWidth) / 2
    lock.current += 1
    const token = lock.current
    scroller.scrollTo({ left, behavior: "smooth" })
    window.setTimeout(() => {
      if (lock.current === token) lock.current = 0
    }, 480)
  }

  useEffect(() => {
    if (indexRef.current === index) return
    indexRef.current = index
    scrollTo(index)
  }, [index])

  useEffect(() => {
    onNeed(hits)
  }, [hits, onNeed])

  useEffect(() => {
    if (!playingKey) return
    const next = hits.findIndex((hit) => hitKey(hit) === playingKey)
    if (next >= 0 && next !== indexRef.current) setIndex(next)
  }, [hits, playingKey])

  function readIndex() {
    const scroller = scrollerRef.current
    if (!scroller || lock.current) return
    const slides = [...scroller.querySelectorAll<HTMLElement>("[data-flow-slide]")]
    const center = scroller.scrollLeft + scroller.clientWidth / 2
    let best = 0
    let bestDist = Number.POSITIVE_INFINITY
    slides.forEach((slide, slideIndex) => {
      const mid = slide.offsetLeft + slide.offsetWidth / 2
      const dist = Math.abs(mid - center)
      if (dist < bestDist) {
        bestDist = dist
        best = slideIndex
      }
    })
    if (best !== indexRef.current) {
      indexRef.current = best
      setIndex(best)
    }
  }

  function onScroll() {
    if (frame.current != null) cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(readIndex)
  }

  function move(next: number) {
    const clamped = Math.max(0, Math.min(hits.length - 1, next))
    if (clamped === indexRef.current) return
    indexRef.current = clamped
    setIndex(clamped)
    scrollTo(clamped)
  }

  if (!current) return null
  const entry = catalog[currentKey]

  return (
    <div
      id={`cover-flow-${year}`}
      className="flow"
      data-flow-year={year}
      role="region"
      aria-roledescription="carousel"
      aria-label={`Cover Flow for ${year}`}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") {
          event.preventDefault()
          move(safeIndex + 1)
        } else if (event.key === "ArrowLeft") {
          event.preventDefault()
          move(safeIndex - 1)
        }
      }}
    >
      <div className="flow-stage">
        <button
          type="button"
          className="flow-nav prev"
          aria-label={`Previous song in ${year}`}
          disabled={safeIndex <= 0}
          onClick={() => move(safeIndex - 1)}
        >
          <span aria-hidden="true">‹</span>
        </button>
        <div ref={scrollerRef} className="flow-scroller" onScroll={onScroll}>
          {hits.map((hit, slideIndex) => {
            const key = hitKey(hit)
            const art = catalog[key]
            const showArt = Boolean(art?.artworkUrl) && !brokenArt[key]
            const delta = slideIndex - safeIndex
            const distance = Math.max(-3, Math.min(3, delta))
            const near = Math.abs(delta) <= 3
            return (
              <div
                key={key}
                className="flow-slide"
                data-flow-slide
                data-active={delta === 0 ? "true" : "false"}
                data-distance={distance}
              >
                {showArt ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className="cover"
                    src={art?.artworkUrl ?? ""}
                    alt=""
                    width={240}
                    height={240}
                    draggable={false}
                    decoding="async"
                    loading={near ? "eager" : "lazy"}
                    fetchPriority={priority && delta === 0 ? "high" : "auto"}
                    onError={() => onBroken(key)}
                  />
                ) : (
                  <span className="cover cover-fallback" aria-hidden="true" />
                )}
              </div>
            )
          })}
        </div>
        <button
          type="button"
          className="flow-nav next"
          aria-label={`Next song in ${year}`}
          disabled={safeIndex >= hits.length - 1}
          onClick={() => move(safeIndex + 1)}
        >
          <span aria-hidden="true">›</span>
        </button>
      </div>
      <div className="flow-caption">
        <p className="flow-count">
          {safeIndex + 1} of {hits.length}
        </p>
        <p className="flow-title">{current.title}</p>
        <p className="flow-artist">{current.artist}</p>
        <p className="flow-year">{current.year}</p>
        <div className="flow-actions">
          <button
            type="button"
            className="track-play"
            aria-pressed={playingKey === currentKey}
            disabled={!entry?.previewUrl}
            aria-label={playingKey === currentKey ? `Pause preview of ${current.title}` : `Play preview of ${current.title}`}
            onClick={() => onTogglePlay(current)}
          >
            {playingKey === currentKey ? "Pause" : "Play"}
          </button>
          <AppleMusicBadge
            url={entry?.url}
            title={current.title}
            artist={current.artist}
            placement={placement}
            affiliateToken={affiliateToken}
          />
        </div>
      </div>
    </div>
  )
}
