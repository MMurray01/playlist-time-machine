"use client"

import { useEffect, useRef, useState } from "react"
import { dealWall, wallMotionEnabled, wallTileCount } from "@/lib/hero/wall"

const SWAP_MS = 8000
const REVEAL_MS = 160

type Layout = { wide: boolean; reduce: boolean }

function useWallLayout(): Layout | null {
  const [layout, setLayout] = useState<Layout | null>(null)
  useEffect(() => {
    const wideQuery = window.matchMedia("(min-width: 721px)")
    const reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    const read = () => setLayout({ wide: wideQuery.matches, reduce: reduceQuery.matches })
    read()
    wideQuery.addEventListener("change", read)
    reduceQuery.addEventListener("change", read)
    return () => {
      wideQuery.removeEventListener("change", read)
      reduceQuery.removeEventListener("change", read)
    }
  }, [])
  return layout
}

function CoverTile({ src, still }: { src: string; still: boolean }) {
  const [front, setFront] = useState(src)
  const [back, setBack] = useState<string | null>(null)
  const [frontReady, setFrontReady] = useState(false)
  const [backReady, setBackReady] = useState(false)

  useEffect(() => {
    if (src === front || src === back) return
    if (still) {
      setFront(src)
      setBack(null)
      setFrontReady(false)
      setBackReady(false)
      return
    }
    setBack(src)
    setBackReady(false)
  }, [src, still, front, back])

  return (
    <>
      {/* Catalog thumbs are already 100px. next/image would add another loader on the hero. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={front}
        alt=""
        width={100}
        height={100}
        decoding="async"
        loading="lazy"
        fetchPriority="low"
        className={frontReady ? "is-in" : undefined}
        onLoad={() => setFrontReady(true)}
      />
      {back ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={back}
          alt=""
          width={100}
          height={100}
          decoding="async"
          loading="lazy"
          fetchPriority="low"
          className={backReady ? "is-in" : undefined}
          onLoad={() => setBackReady(true)}
          onTransitionEnd={() => {
            if (!backReady) return
            setFront(back)
            setFrontReady(true)
            setBack(null)
            setBackReady(false)
          }}
        />
      ) : null}
    </>
  )
}

export function HeroWall() {
  const layout = useWallLayout()
  const [tiles, setTiles] = useState<string[]>([])
  const [revealed, setRevealed] = useState(0)
  const [hidden, setHidden] = useState(false)
  const [generation, setGeneration] = useState(0)
  const spares = useRef<string[]>([])
  const count = layout ? wallTileCount(layout.wide) : 0
  const motion = layout ? wallMotionEnabled(layout.reduce, hidden) : false

  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden)
    onVisibility()
    document.addEventListener("visibilitychange", onVisibility)
    return () => document.removeEventListener("visibilitychange", onVisibility)
  }, [])

  useEffect(() => {
    if (!count) return
    let cancel = false
    void import("@/data/cover-thumbs.json")
      .then((mod) => {
        if (cancel) return
        const urls = (mod.default as string[]).filter((url) => url.startsWith("https://"))
        const dealt = dealWall(urls, count)
        spares.current = dealt.spares
        setTiles(dealt.tiles)
        setGeneration((value) => value + 1)
      })
      .catch(() => {})
    return () => {
      cancel = true
    }
  }, [count])

  useEffect(() => {
    if (generation === 0 || tiles.length === 0) return
    let shown = Math.min(6, tiles.length)
    const total = tiles.length
    setRevealed(shown)
    if (shown >= total) return
    let timer = 0
    const step = () => {
      if (document.hidden) {
        timer = window.setTimeout(step, 400)
        return
      }
      shown = Math.min(total, shown + 6)
      setRevealed(shown)
      if (shown < total) timer = window.setTimeout(step, REVEAL_MS)
    }
    timer = window.setTimeout(step, REVEAL_MS)
    return () => window.clearTimeout(timer)
  }, [generation, tiles.length])

  useEffect(() => {
    if (!motion || tiles.length === 0) return
    const swaps = layout?.wide ? 2 : 1
    const timer = window.setInterval(() => {
      if (document.hidden || spares.current.length === 0) return
      setTiles((current) => {
        if (current.length === 0) return current
        const next = [...current]
        const picks = new Set<number>()
        while (picks.size < Math.min(swaps, next.length) && spares.current.length > 0) {
          picks.add(Math.floor(Math.random() * next.length))
        }
        for (const index of picks) {
          const spare = spares.current.shift()
          if (!spare) break
          const previous = next[index]
          if (previous) spares.current.push(previous)
          next[index] = spare
        }
        return next
      })
    }, SWAP_MS)
    return () => window.clearInterval(timer)
  }, [motion, tiles.length, layout?.wide])

  return (
    <div className="hero-wall" aria-hidden="true">
      <div className={hidden ? "hero-mosaic is-paused" : "hero-mosaic"}>
        {Array.from({ length: count }, (_, index) => {
          const src = tiles[index]
          return (
            <div className="hero-tile" key={index}>
              {src && index < revealed ? <CoverTile src={src} still={Boolean(layout?.reduce)} /> : null}
            </div>
          )
        })}
      </div>
      <div className="hero-scrim" />
    </div>
  )
}
