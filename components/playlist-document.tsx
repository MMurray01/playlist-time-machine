"use client"

import dynamic from "next/dynamic"
import { useEffect, useRef, useState } from "react"
import { sharePlaylistAction } from "@/actions/playlist-actions"
import { loadMusicKit } from "@/components/musickit"
import { AppleMusicBadge } from "@/components/apple-badge"
import { CoverFlow } from "@/components/cover-flow"
import { SongDetail } from "@/components/song-detail"
import { readResultsView, writeResultsView, type ResultsView } from "@/lib/playlist/browse"
import { downloadFilename, playlistCsv, playlistText } from "@/lib/playlist/export"
import { hitKey } from "@/lib/playlist/hits"
import type {
  BuiltPlaylist,
  ChartHit,
  MatchedTrack,
  ProviderAvailability,
  UnmatchedTrack,
  YearChapter,
} from "@/lib/playlist/types"
import {
  appleLibraryPlaylistDescription,
  appleLibraryPlaylistName,
} from "@/lib/playlist/apple-library"
import { appleLinkRel, withAppleAffiliate, type AffiliatePlacement } from "@/lib/affiliate"

const LibraryCover = dynamic(() => import("@/components/library-cover").then((mod) => mod.LibraryCover), {
  ssr: false,
})

type LookupResult = {
  matches: MatchedTrack[]
  unmatched: UnmatchedTrack[]
  skipped?: boolean
  needsAuth?: boolean
}

async function lookupHits(
  hits: ChartHit[],
  onBatch?: (result: LookupResult) => void,
): Promise<LookupResult> {
  const matches: MatchedTrack[] = []
  const unmatched: UnmatchedTrack[] = []
  for (let index = 0; index < hits.length; index += 20) {
    const slice = hits.slice(index, index + 20)
    const response = await fetch("/api/providers/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tracks: slice.map((hit) => ({
          key: hitKey(hit),
          title: hit.title,
          artist: hit.artist,
          appleSongId: hit.appleSongId,
          isrc: hit.isrc ?? null,
        })),
      }),
    })
    if (response.status === 401) return { matches, unmatched, needsAuth: true }
    if (!response.ok) throw new Error("lookup")
    const body = (await response.json()) as LookupResult & { skipped?: boolean }
    if (body.skipped) return { matches, unmatched, skipped: true }
    matches.push(...(body.matches ?? []))
    unmatched.push(...(body.unmatched ?? []))
    if (body.matches && body.matches.length > 0) onBatch?.({ matches: body.matches, unmatched: [] })
  }
  return { matches, unmatched }
}

function weeksLabel(weeks: number | null): string | null {
  if (weeks == null || weeks <= 0) return null
  return weeks === 1 ? "1 week at No. 1" : `${weeks} weeks at No. 1`
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

function Cover({
  hit,
  art,
  pending,
  broken,
  eager,
  onError,
}: {
  hit: ChartHit
  art: string | undefined
  pending: boolean
  broken: boolean
  eager: boolean
  onError: () => void
}) {
  if (art && !broken) {
    return (
      // Artwork hosts vary, so this stays a sized plain image.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={art}
        alt=""
        width={240}
        height={240}
        className="cover"
        decoding="async"
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : "low"}
        onError={onError}
      />
    )
  }
  return (
    <span aria-hidden="true" className="cover cover-fallback">
      {pending ? "" : initials(hit.title)}
    </span>
  )
}

function YearBlock({
  chapter,
  catalog,
  brokenArt,
  songs,
  flow,
  eager,
  onVisible,
  onSelect,
  onBroken,
  playingKey,
  onTogglePlay,
  badgePlacement,
  affiliateToken,
}: {
  chapter: YearChapter
  catalog: Record<string, MatchedTrack | null>
  brokenArt: Record<string, true>
  songs: boolean
  flow: boolean
  eager: boolean
  onVisible: (hits: ChartHit[]) => void
  onSelect: (key: string) => void
  onBroken: (key: string) => void
  playingKey: string | null
  onTogglePlay: (hit: ChartHit) => void
  badgePlacement: AffiliatePlacement
  affiliateToken: string | null
}) {
  const ref = useRef<HTMLElement>(null)
  const hits = chapter.hits
  const [shown, setShown] = useState(eager)

  useEffect(() => {
    const node = ref.current
    if (!node || hits.length === 0) return
    let active = true
    let done = false
    const finish = () => {
      if (!active || done) return
      done = true
      onVisible(hits)
      setShown(true)
      window.removeEventListener("scroll", consider)
      window.removeEventListener("resize", consider)
    }
    const consider = () => {
      if (!active || done) return
      const rect = node.getBoundingClientRect()
      // Anything already above the fold has been scrolled to, including rows a
      // fast jump would skip past an IntersectionObserver root margin.
      if (rect.top >= window.innerHeight + 800) return
      finish()
    }
    consider()
    if (!done) {
      window.addEventListener("scroll", consider, { passive: true })
      window.addEventListener("resize", consider)
    }
    return () => {
      active = false
      window.removeEventListener("scroll", consider)
      window.removeEventListener("resize", consider)
    }
  }, [hits, onVisible])

  return (
    <article ref={ref} id={`year-${chapter.year}`} className="year-block">
      <div className="year-heading">
        <h2>
          {chapter.year} · {chapter.hits.length} {chapter.hits.length === 1 ? "hit" : "hits"}
        </h2>
      </div>
      {chapter.story.editorial ? <p className="story">{chapter.story.editorial}</p> : null}
      <p className="story">{chapter.story.summary}</p>
      {flow && shown && chapter.hits.length > 0 ? (
        <CoverFlow
          year={chapter.year}
          hits={chapter.hits}
          catalog={catalog}
          brokenArt={brokenArt}
          playingKey={playingKey}
          onTogglePlay={onTogglePlay}
          onBroken={onBroken}
          onNeed={onVisible}
          affiliateToken={affiliateToken}
          placement={badgePlacement}
          priority={eager}
        />
      ) : null}
      {songs && chapter.hits.length > 0 ? (
        <ol className="tracks">
          {chapter.hits.map((hit) => {
            const key = hitKey(hit)
            const entry = catalog[key]
            const weeks = weeksLabel(hit.weeksAtNumberOne)
            return (
              <li key={key} className="track">
                <button
                  type="button"
                  className="track-cover-btn"
                  aria-label={`Open ${hit.title} by ${hit.artist}`}
                  onClick={() => onSelect(key)}
                >
                  <Cover
                    hit={hit}
                    art={entry?.artworkUrl ?? undefined}
                    pending={entry === undefined}
                    broken={Boolean(brokenArt[key])}
                    eager={eager}
                    onError={() => onBroken(key)}
                  />
                </button>
                <div className="track-main">
                  <button type="button" className="track-copy" onClick={() => onSelect(key)}>
                    <span className="track-title">{hit.title}</span>
                    <span className="track-meta">
                      {hit.artist}
                      {weeks ? ` · ${weeks}` : ""}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="track-play"
                    aria-pressed={playingKey === key}
                    disabled={!entry?.previewUrl}
                    aria-label={
                      playingKey === key ? `Pause preview of ${hit.title}` : `Play preview of ${hit.title}`
                    }
                    onClick={() => onTogglePlay(hit)}
                  >
                    {playingKey === key ? "Pause" : "Play"}
                  </button>
                </div>
                <AppleMusicBadge
                  url={entry?.url}
                  title={hit.title}
                  artist={hit.artist}
                  placement={badgePlacement}
                  affiliateToken={affiliateToken}
                />
              </li>
            )
          })}
        </ol>
      ) : null}
    </article>
  )
}

export function PlaylistDocument({
  playlist,
  providers,
  mode,
  affiliateToken = null,
  openCollage = false,
}: {
  playlist: BuiltPlaylist
  providers: ProviderAvailability
  mode: "builder" | "shared"
  affiliateToken?: string | null
  openCollage?: boolean
}) {
  const [name, setName] = useState(playlist.title)
  const [catalog, setCatalog] = useState<Record<string, MatchedTrack | null>>({})
  const [brokenArt, setBrokenArt] = useState<Record<string, true>>({})
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [browse, setBrowse] = useState<ResultsView>("flow")
  const [canPlayFull, setCanPlayFull] = useState(false)
  const requested = useRef(new Set<string>())
  const generation = useRef(0)
  const catalogRef = useRef(catalog)
  catalogRef.current = catalog
  const [status, setStatus] = useState("")
  const [error, setError] = useState("")
  const [playlistUrl, setPlaylistUrl] = useState("")
  const [appleSaved, setAppleSaved] = useState<{ name: string; description: string } | null>(null)
  const [shareUrl, setShareUrl] = useState("")
  const [unmatched, setUnmatched] = useState<UnmatchedTrack[]>([])
  const [busy, setBusy] = useState(false)
  const [playingKey, setPlayingKey] = useState<string | null>(null)
  const [autoAdvance, setAutoAdvance] = useState(true)
  const [collageOpen, setCollageOpen] = useState(openCollage)
  const [CollageView, setCollageView] = useState<typeof import("@/components/cover-collage").CoverCollage | null>(null)
  const previewAudio = useRef<HTMLAudioElement>(null)
  const collageLinkRef = useRef<HTMLButtonElement>(null)
  const seenPlaylist = useRef(playlist)
  const titleTag = mode === "shared" ? "h1" : "h2"
  const Title = titleTag
  const badgePlacement: AffiliatePlacement = mode === "shared" ? "share-page" : "preview-badge"

  useEffect(() => {
    generation.current += 1
    setName(playlist.title)
    setCatalog({})
    setBrokenArt({})
    setSelectedKey(null)
    requested.current = new Set()
    setUnmatched([])
    setPlaylistUrl("")
    setAppleSaved(null)
    setShareUrl("")
    setError("")
    setStatus("")
    setCanPlayFull(false)
    setPlayingKey(null)
    if (seenPlaylist.current !== playlist) {
      seenPlaylist.current = playlist
      setCollageOpen(false)
    }
    previewAudio.current?.pause()
  }, [playlist])

  useEffect(() => {
    setBrowse(readResultsView(window.localStorage))
  }, [])

  function chooseView(view: ResultsView) {
    setBrowse(view)
    writeResultsView(window.localStorage, view)
  }

  useEffect(() => {
    if (!collageOpen || CollageView) return
    let cancelled = false
    void import("@/components/cover-collage").then((mod) => {
      if (!cancelled) setCollageView(() => mod.CoverCollage)
    })
    return () => {
      cancelled = true
    }
  }, [CollageView, collageOpen])

  function rememberLookup(result: LookupResult) {
    setCatalog((current) => {
      const next = { ...current }
      for (const match of result.matches) next[match.key] = match
      for (const miss of result.unmatched) next[miss.key] = null
      return next
    })
  }

  const loadHits = useRef<(hits: ChartHit[]) => Promise<void>>(async () => {})
  loadHits.current = async (hits: ChartHit[]) => {
    const ticket = generation.current
    const pending = hits.filter((hit) => {
      const key = hitKey(hit)
      if (requested.current.has(key)) return false
      requested.current.add(key)
      return true
    })
    if (pending.length === 0) return
    try {
      let result = await lookupHits(pending, (partial) => {
        if (ticket !== generation.current) return
        rememberLookup(partial)
      })
      if (ticket !== generation.current) return
      if (result.skipped) {
        for (const hit of pending) requested.current.delete(hitKey(hit))
        return
      }
      const failed = result.unmatched.filter((row) => row.reason === "search_failed")
      if (failed.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, 700))
        if (ticket !== generation.current) return
        const retryHits = pending.filter((hit) => failed.some((row) => row.key === hitKey(hit)))
        const second = await lookupHits(retryHits, (partial) => {
          if (ticket !== generation.current) return
          rememberLookup(partial)
        })
        if (ticket !== generation.current) return
        result = {
          matches: [...result.matches, ...second.matches],
          unmatched: [
            ...result.unmatched.filter((row) => row.reason !== "search_failed"),
            ...second.unmatched,
          ],
        }
      }
      rememberLookup(result)
    } catch {
      if (ticket !== generation.current) return
      for (const hit of pending) requested.current.delete(hitKey(hit))
    }
  }

  useEffect(() => {
    const first = playlist.years.filter((chapter) => chapter.hits.length > 0).slice(0, 3)
    void loadHits.current(first.flatMap((chapter) => chapter.hits))
  }, [playlist])

  const onVisible = useRef((hits: ChartHit[]) => {
    void loadHits.current(hits)
  })

  async function saveApple() {
    if (busy) return
    setBusy(true)
    setError("")
    setStatus("Checking Apple Music for these songs.")
    setUnmatched([])
    try {
      const known = catalogRef.current
      const missing = playlist.hits.filter((hit) => !(hitKey(hit) in known))
      const lookup = missing.length > 0 ? await lookupHits(missing) : { matches: [], unmatched: [] }
      if (lookup.skipped) {
        setError("Apple Music is not set up on this site yet.")
        setStatus("")
        setBusy(false)
        return
      }
      rememberLookup(lookup)
      const found = new Map<string, MatchedTrack>()
      for (const hit of playlist.hits) {
        const key = hitKey(hit)
        const prior = known[key]
        if (prior) found.set(key, prior)
      }
      for (const match of lookup.matches) found.set(match.key, match)
      const matches = playlist.hits.flatMap((hit) => {
        const match = found.get(hitKey(hit))
        return match ? [match] : []
      })
      const misses = [
        ...lookup.unmatched,
        ...playlist.hits
          .filter((hit) => known[hitKey(hit)] === null)
          .map((hit) => ({
            key: hitKey(hit),
            title: hit.title,
            artist: hit.artist,
            reason: "not_in_catalog" as const,
          })),
      ]
      setUnmatched(misses)
      const missed = misses.filter((song) => song.reason === "not_in_catalog")
      if (matches.length === 0) {
        setError(
          missed.length > 0
            ? "Apple Music didn’t have these songs, so nothing was saved."
            : "Apple Music could not be checked. Try again.",
        )
        setStatus("")
        setBusy(false)
        return
      }
      setStatus("Opening Apple Music so you can approve the playlist.")
      const tokenResponse = await fetch("/api/apple/token")
      if (!tokenResponse.ok) {
        setError(
          tokenResponse.status === 404
            ? "Apple Music is not set up on this site yet."
            : "Apple Music is not available right now.",
        )
        setStatus("")
        setBusy(false)
        return
      }
      const tokenBody = (await tokenResponse.json()) as { developerToken?: string }
      if (!tokenBody.developerToken) {
        setError("Apple Music is not available right now.")
        setStatus("")
        setBusy(false)
        return
      }
      await loadMusicKit()
      if (!window.MusicKit) throw new Error("musickit")
      const music = await window.MusicKit.configure({
        developerToken: tokenBody.developerToken,
        app: { name: "Playlist Time Machine", build: "2.0.0" },
      })
      const userToken = await music.authorize()
      setCanPlayFull(true)
      setStatus(`Saving ${matches.length} songs to Apple Music.`)
      const appleName = appleLibraryPlaylistName(playlist.graduationYear)
      const shareForApple =
        mode === "shared"
          ? (() => {
              const url = new URL(window.location.href)
              url.search = ""
              url.hash = ""
              return url.toString()
            })()
          : shareUrl || null
      const appleDescription = appleLibraryPlaylistDescription(
        playlist.startYear,
        playlist.endYear,
        shareForApple,
      )
      const response = await fetch("/api/apple/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userToken,
          name: appleName,
          description: appleDescription,
          trackIds: matches.map((match) => match.catalogId),
        }),
      })
      const body = (await response.json()) as {
        ok?: boolean
        error?: string
        playlistUrl?: string | null
        addedCount?: number
      }
      if (!response.ok || !body.ok) {
        setError(body.error || "Apple Music could not save the playlist.")
        setStatus(typeof body.addedCount === "number" ? `Apple Music kept ${body.addedCount} songs.` : "")
      } else {
        setPlaylistUrl(body.playlistUrl || "")
        setAppleSaved({ name: appleName, description: appleDescription })
        const saved = body.addedCount ?? matches.length
        const missingNote =
          missed.length > 0
            ? ` ${missed.length} ${missed.length === 1 ? "song was" : "songs were"} not in Apple Music.`
            : ""
        setStatus(`Saved ${saved} of ${playlist.hits.length} songs to Apple Music.${missingNote}`)
      }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : ""
      setError(
        message.toLowerCase().includes("cancel") || message.toLowerCase().includes("denied")
          ? "Apple Music sign-in was canceled."
          : "Apple Music could not finish. Try again.",
      )
      setStatus("")
    } finally {
      setBusy(false)
    }
  }

  function downloadList(extension: "csv" | "txt") {
    const contents = extension === "csv" ? playlistCsv(playlist.hits) : playlistText(playlist)
    const blob = new Blob([contents], { type: extension === "csv" ? "text/csv;charset=utf-8" : "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = downloadFilename(name || playlist.title, extension)
    link.click()
    URL.revokeObjectURL(url)
  }

  async function share() {
    setError("")
    if (mode === "shared") {
      const url = window.location.href
      setShareUrl(url)
      try {
        await navigator.clipboard.writeText(url)
        setStatus("Link copied.")
      } catch {
        setStatus("Copy this link to share the playlist.")
      }
      return
    }

    setBusy(true)
    setStatus("Creating a share link.")
    try {
      const result = await sharePlaylistAction({
        graduationYear: playlist.graduationYear,
        title: name,
      })
      if (!result.ok) {
        setError(result.error)
        setStatus("")
      } else {
        setShareUrl(result.url)
        try {
          await navigator.clipboard.writeText(result.url)
          setStatus("Link copied.")
        } catch {
          setStatus("Copy this link to share the playlist.")
        }
      }
    } catch {
      setError("The share link could not be saved. Try again.")
      setStatus("")
    } finally {
      setBusy(false)
    }
  }

  async function ensureSharePage(): Promise<string | null> {
    if (mode === "shared") {
      const url = new URL(window.location.href)
      url.search = ""
      url.hash = ""
      return url.toString()
    }
    if (shareUrl) return shareUrl
    try {
      const result = await sharePlaylistAction({
        graduationYear: playlist.graduationYear,
        title: name,
      })
      if (!result.ok) return null
      setShareUrl(result.url)
      return result.url
    } catch {
      return null
    }
  }

  const notFoundLabel = unmatched.filter((song) => song.reason === "not_in_catalog")
  const failedLabel = unmatched.filter((song) => song.reason === "search_failed")
  const selected = selectedKey ? (playlist.hits.find((hit) => hitKey(hit) === selectedKey) ?? null) : null
  const eagerYears = new Set(
    playlist.years
      .filter((chapter) => chapter.hits.length > 0)
      .slice(0, 1)
      .map((chapter) => chapter.year),
  )

  useEffect(() => {
    if (!selected) return
    previewAudio.current?.pause()
    setPlayingKey(null)
    void loadHits.current([selected])
  }, [selected])

  function playPreview(hit: ChartHit) {
    const key = hitKey(hit)
    const preview = catalogRef.current[key]?.previewUrl
    const audio = previewAudio.current
    if (!preview || !audio) return
    if (playingKey === key && !audio.paused) {
      audio.pause()
      setPlayingKey(null)
      return
    }
    audio.src = preview
    void audio.play().then(
      () => setPlayingKey(key),
      () => setPlayingKey(null),
    )
  }

  function advancePreview() {
    if (!autoAdvance || !playingKey) {
      setPlayingKey(null)
      return
    }
    const index = playlist.hits.findIndex((hit) => hitKey(hit) === playingKey)
    for (let next = index + 1; next < playlist.hits.length; next += 1) {
      const hit = playlist.hits[next]
      if (!hit) continue
      const preview = catalogRef.current[hitKey(hit)]?.previewUrl
      const audio = previewAudio.current
      if (!preview || !audio) continue
      audio.src = preview
      void audio.play().then(
        () => setPlayingKey(hitKey(hit)),
        () => setPlayingKey(null),
      )
      return
    }
    setPlayingKey(null)
  }

  return (
    <section id="playlist" aria-labelledby="playlist-title" className="results">
      <div className="playlist-head">
        <Title id="playlist-title">{mode === "shared" ? playlist.title : name || playlist.title}</Title>
        <div className="stat-row" aria-label="Playlist totals">
          <span className="stat-chip">Class of {playlist.graduationYear}</span>
          <span className="stat-chip">
            {playlist.startYear}–{playlist.endYear}
          </span>
          <span className="stat-chip">
            {playlist.hits.length} #1 {playlist.hits.length === 1 ? "hit" : "hits"}
          </span>
        </div>
        <p className="summary">Every number one hit, in the order they reached the top.</p>
      </div>

      <button
        ref={collageLinkRef}
        type="button"
        className="collage-cta"
        data-collage-link
        disabled={playlist.hits.length === 0}
        onClick={() => {
          performance.mark("collage-open")
          setCollageOpen(true)
        }}
      >
        <span className="collage-cta-mosaic" aria-hidden="true">
          {playlist.hits.slice(0, 4).map((hit) => {
            const key = hitKey(hit)
            const entry = catalog[key]
            return (
              <Cover
                key={key}
                hit={hit}
                art={entry?.artworkUrl ?? undefined}
                pending={entry === undefined}
                broken={Boolean(brokenArt[key])}
                eager
                onError={() => setBrokenArt((current) => ({ ...current, [key]: true }))}
              />
            )
          })}
        </span>
        <span className="collage-cta-copy">
          <span className="collage-cta-title">Make your cover collage</span>
          <span className="collage-cta-detail">A free square or phone wallpaper made from these album covers.</span>
        </span>
      </button>
      {collageOpen && !CollageView ? (
        <p role="status" className="quiet">
          Opening the collage.
        </p>
      ) : null}

      {mode === "builder" ? (
        <div style={{ marginTop: "1.5rem" }}>
          <label htmlFor="playlist-name" className="field-label">
            Playlist name
          </label>
          <input
            id="playlist-name"
            value={name}
            onChange={(event) => setName(event.target.value.slice(0, 80))}
            maxLength={80}
            className="name-field"
          />
        </div>
      ) : null}

      <div className="actions">
        <button
          type="button"
          onClick={() => void saveApple()}
          disabled={busy || playlist.hits.length === 0}
          className="btn btn-accent"
        >
          Save to Apple Music
        </button>
        <button type="button" onClick={() => void share()} disabled={busy || playlist.hits.length === 0} className="btn btn-ghost">
          Share
        </button>
      </div>
      <div className="download">
        <span id="download-label">Download list</span>
        <button
          type="button"
          aria-describedby="download-label"
          disabled={playlist.hits.length === 0}
          onClick={() => downloadList("txt")}
        >
          TXT
        </button>
        <button
          type="button"
          aria-describedby="download-label"
          disabled={playlist.hits.length === 0}
          onClick={() => downloadList("csv")}
        >
          CSV
        </button>
      </div>
      <p role="status" aria-live="polite" className="quiet" style={{ marginTop: "0.85rem" }}>
        {status}
      </p>
      {error ? (
        <p role="alert" className="alert">
          {error}
        </p>
      ) : null}
      {playlistUrl ? (
        <a
          className="linkish"
          href={withAppleAffiliate(playlistUrl, "save-flow", affiliateToken)}
          target="_blank"
          rel={appleLinkRel(affiliateToken)}
        >
          Open the saved playlist
        </a>
      ) : null}
      {appleSaved ? (
        <LibraryCover
          graduationYear={playlist.graduationYear}
          startYear={playlist.startYear}
          endYear={playlist.endYear}
          hits={playlist.hits}
          catalog={catalog}
          description={appleSaved.description}
        />
      ) : null}
      {shareUrl ? (
        <p className="quiet" style={{ marginTop: "0.45rem", overflowWrap: "anywhere" }}>
          <a href={shareUrl} className="linkish">
            {shareUrl}
          </a>
        </p>
      ) : null}
      {notFoundLabel.length > 0 ? (
        <details className="details">
          <summary>
            {notFoundLabel.length} {notFoundLabel.length === 1 ? "song was" : "songs were"} not in the catalog
          </summary>
          <ul style={{ marginTop: "0.5rem" }}>
            {notFoundLabel.map((song) => (
              <li key={song.key}>
                {song.title} by {song.artist}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      {failedLabel.length > 0 ? (
        <p className="quiet" style={{ marginTop: "0.45rem" }}>
          {failedLabel.length} {failedLabel.length === 1 ? "song could" : "songs could"} not be checked. Try saving again.
        </p>
      ) : null}

      <nav aria-label="Years in this playlist" className="year-jump">
        {playlist.years.map((chapter) => (
          <a key={chapter.year} href={`#year-${chapter.year}`}>
            {chapter.year}
          </a>
        ))}
      </nav>

      <div className="view-toggle" role="group" aria-label="How to browse songs">
        <button type="button" aria-pressed={browse === "flow"} onClick={() => chooseView("flow")}>
          Cover Flow
        </button>
        <button type="button" aria-pressed={browse === "list"} onClick={() => chooseView("list")}>
          List
        </button>
        <button type="button" aria-pressed={autoAdvance} onClick={() => setAutoAdvance((current) => !current)}>
          {autoAdvance ? "Next preview: on" : "Next preview: off"}
        </button>
      </div>
      <audio ref={previewAudio} preload="none" onEnded={advancePreview} />
      <p className="courtesy">Preview provided courtesy of Apple.</p>

      <div>
        {playlist.years.map((chapter) => (
          <YearBlock
            key={chapter.year}
            chapter={chapter}
            catalog={catalog}
            brokenArt={brokenArt}
            songs={browse === "list"}
            flow={browse === "flow"}
            eager={eagerYears.has(chapter.year)}
            onVisible={onVisible.current}
            onSelect={setSelectedKey}
            onBroken={(key) => setBrokenArt((current) => ({ ...current, [key]: true }))}
            playingKey={playingKey}
            onTogglePlay={playPreview}
            badgePlacement={badgePlacement}
            affiliateToken={affiliateToken}
          />
        ))}
      </div>

      {selected ? (
        <SongDetail
          key={selectedKey ?? undefined}
          hit={selected}
          match={selectedKey ? catalog[selectedKey] : undefined}
          canPlayFull={canPlayFull}
          affiliateToken={affiliateToken}
          placement={badgePlacement}
          onClose={() => setSelectedKey(null)}
          onPreview={() => {
            previewAudio.current?.pause()
            setPlayingKey(null)
          }}
        />
      ) : null}
      {CollageView && collageOpen ? (
        <CollageView
          hits={playlist.hits}
          title={name.trim() || playlist.title}
          startYear={playlist.startYear}
          endYear={playlist.endYear}
          catalog={catalog}
          onRequestCovers={(rows) => {
            void loadHits.current(rows)
          }}
          onEnsureShareUrl={ensureSharePage}
          onClose={() => {
            setCollageOpen(false)
            collageLinkRef.current?.focus()
          }}
        />
      ) : null}
    </section>
  )
}
