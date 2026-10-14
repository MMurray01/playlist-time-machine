"use client"

import { useEffect, useRef } from "react"
import { AppleMusicBadge } from "@/components/apple-badge"
import type { AffiliatePlacement } from "@/lib/affiliate"
import { hitKey } from "@/lib/playlist/hits"
import type { ChartHit, MatchedTrack } from "@/lib/playlist/types"

export function CoverFlow({
  hits,
  index,
  onIndex,
  catalog,
  brokenArt,
  playingKey,
  onTogglePlay,
  onBroken,
  onNeed,
  affiliateToken,
  placement,
}: {
  hits: ChartHit[]
  index: number
  onIndex: (index: number) => void
  catalog: Record<string, MatchedTrack | null>
  brokenArt: Record<string, true>
  playingKey: string | null
  onTogglePlay: (hit: ChartHit) => void
  onBroken: (key: string) => void
  onNeed: (hits: ChartHit[]) => void
  affiliateToken: string | null
  placement: AffiliatePlacement
}) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const indexRef = useRef(index)
  const frame = useRef<number | null>(null)
  const lock = useRef(0)
  const current = hits[index] ?? hits[0]
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
    const start = Math.max(0, index - 1)
    onNeed(hits.slice(start, Math.min(hits.length, index + 4)))
  }, [hits, index, onNeed])

  useEffect(() => {
    if (!playingKey) return
    const next = hits.findIndex((hit) => hitKey(hit) === playingKey)
    if (next >= 0 && next !== indexRef.current) onIndex(next)
  }, [hits, onIndex, playingKey])

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
      onIndex(best)
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
    onIndex(clamped)
    scrollTo(clamped)
  }

  if (!current) return null
  const entry = catalog[currentKey]

  return (
    <div
      id="cover-flow"
      className="flow"
      role="region"
      aria-roledescription="carousel"
      aria-label="Cover Flow"
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") {
          event.preventDefault()
          move(index + 1)
        } else if (event.key === "ArrowLeft") {
          event.preventDefault()
          move(index - 1)
        }
      }}
    >
      <div className="flow-stage">
        <button
          type="button"
          className="flow-nav prev"
          aria-label="Previous song"
          disabled={index <= 0}
          onClick={() => move(index - 1)}
        >
          <span aria-hidden="true">‹</span>
        </button>
        <div ref={scrollerRef} className="flow-scroller" onScroll={onScroll}>
          {hits.map((hit, slideIndex) => {
            const key = hitKey(hit)
            const art = catalog[key]
            const showArt = Boolean(art?.artworkUrl) && !brokenArt[key]
            return (
              <div key={key} className="flow-slide" data-flow-slide data-active={slideIndex === index ? "true" : "false"}>
                {showArt ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className="cover"
                    src={art?.artworkUrl ?? ""}
                    alt=""
                    width={320}
                    height={320}
                    draggable={false}
                    decoding="async"
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
          aria-label="Next song"
          disabled={index >= hits.length - 1}
          onClick={() => move(index + 1)}
        >
          <span aria-hidden="true">›</span>
        </button>
      </div>
      <div className="flow-caption">
        <p className="flow-count">
          {index + 1} of {hits.length}
        </p>
        <h3 className="flow-title">{current.title}</h3>
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
