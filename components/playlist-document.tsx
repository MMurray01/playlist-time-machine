"use client"

import { useEffect, useRef, useState, type KeyboardEvent } from "react"
import { sharePlaylistAction } from "@/actions/playlist-actions"
import { loadMusicKit } from "@/components/musickit"
import { SongDetail } from "@/components/song-detail"
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
import { playlistDescription } from "@/lib/playlist/window"

type LookupResult = {
  matches: MatchedTrack[]
  unmatched: UnmatchedTrack[]
  skipped?: boolean
  needsAuth?: boolean
}

async function lookupHits(hits: ChartHit[]): Promise<LookupResult> {
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
        })),
      }),
    })
    if (response.status === 401) return { matches, unmatched, needsAuth: true }
    if (!response.ok) throw new Error("lookup")
    const body = (await response.json()) as LookupResult & { skipped?: boolean }
    if (body.skipped) return { matches, unmatched, skipped: true }
    matches.push(...(body.matches ?? []))
    unmatched.push(...(body.unmatched ?? []))
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

function focusSibling(event: KeyboardEvent<HTMLButtonElement>) {
  if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return
  const buttons = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("button")
  if (!buttons) return
  const index = [...buttons].indexOf(event.currentTarget)
  const next = event.key === "ArrowRight" ? buttons[index + 1] : buttons[index - 1]
  if (!next) return
  event.preventDefault()
  next.focus()
}

function YearBlock({
  chapter,
  catalog,
  brokenArt,
  browse,
  apple,
  eager,
  onVisible,
  onSelect,
  onBroken,
}: {
  chapter: YearChapter
  catalog: Record<string, MatchedTrack | null>
  brokenArt: Record<string, true>
  browse: "list" | "covers"
  apple: boolean
  eager: boolean
  onVisible: (hits: ChartHit[]) => void
  onSelect: (key: string) => void
  onBroken: (key: string) => void
}) {
  const ref = useRef<HTMLElement>(null)
  const hits = chapter.hits

  useEffect(() => {
    const node = ref.current
    if (!node || hits.length === 0) return
    if (typeof IntersectionObserver === "undefined") {
      onVisible(hits)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onVisible(hits)
          observer.disconnect()
        }
      },
      { rootMargin: "480px 0px" },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [hits, onVisible])

  return (
    <article ref={ref} id={`year-${chapter.year}`} className="year-block">
      <div className="year-heading">
        <h3>
          {chapter.year} · {chapter.hits.length} {chapter.hits.length === 1 ? "hit" : "hits"}
        </h3>
      </div>
      {browse === "covers" && chapter.hits.length > 0 ? (
        <div className="cover-row" role="list" aria-label={`${chapter.year} albums`}>
          {chapter.hits.map((hit) => {
            const key = hitKey(hit)
            const entry = catalog[key]
            return (
              <button
                key={key}
                type="button"
                role="listitem"
                className="cover-card"
                onClick={() => onSelect(key)}
                onKeyDown={focusSibling}
              >
                <Cover
                  hit={hit}
                  art={entry?.artworkUrl ?? undefined}
                  pending={apple && entry === undefined}
                  broken={Boolean(brokenArt[key])}
                  eager={eager}
                  onError={() => onBroken(key)}
                />
                <span className="track-title">{hit.title}</span>
                <span className="track-meta">{hit.artist}</span>
              </button>
            )
          })}
        </div>
      ) : null}
      {chapter.story.editorial ? <p className="story">{chapter.story.editorial}</p> : null}
      <p className="story">{chapter.story.summary}</p>
      {chapter.hits.length === 0 || browse === "covers" ? null : (
        <ol className="tracks">
          {chapter.hits.map((hit) => {
            const key = hitKey(hit)
            const entry = catalog[key]
            const weeks = weeksLabel(hit.weeksAtNumberOne)
            return (
              <li key={key} className="track">
                <button type="button" className="track-button" onClick={() => onSelect(key)}>
                  <Cover
                    hit={hit}
                    art={entry?.artworkUrl ?? undefined}
                    pending={apple && entry === undefined}
                    broken={Boolean(brokenArt[key])}
                    eager={eager}
                    onError={() => onBroken(key)}
                  />
                  <span className="track-copy">
                    <span className="track-title">{hit.title}</span>
                    <span className="track-meta">
                      {hit.artist}
                      {weeks ? ` · ${weeks}` : ""}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      )}
    </article>
  )
}

export function PlaylistDocument({
  playlist,
  providers,
  mode,
}: {
  playlist: BuiltPlaylist
  providers: ProviderAvailability
  mode: "builder" | "shared"
}) {
  const [name, setName] = useState(playlist.title)
  const [catalog, setCatalog] = useState<Record<string, MatchedTrack | null>>({})
  const [brokenArt, setBrokenArt] = useState<Record<string, true>>({})
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [browse, setBrowse] = useState<"list" | "covers">("list")
  const [canPlayFull, setCanPlayFull] = useState(false)
  const requested = useRef(new Set<string>())
  const generation = useRef(0)
  const catalogRef = useRef(catalog)
  catalogRef.current = catalog
  const [status, setStatus] = useState("")
  const [error, setError] = useState("")
  const [playlistUrl, setPlaylistUrl] = useState("")
  const [shareUrl, setShareUrl] = useState("")
  const [unmatched, setUnmatched] = useState<UnmatchedTrack[]>([])
  const [busy, setBusy] = useState(false)
  const titleTag = mode === "shared" ? "h1" : "h2"
  const Title = titleTag

  useEffect(() => {
    generation.current += 1
    setName(playlist.title)
    setCatalog({})
    setBrokenArt({})
    setSelectedKey(null)
    requested.current = new Set()
    setUnmatched([])
    setPlaylistUrl("")
    setShareUrl("")
    setError("")
    setStatus("")
    setCanPlayFull(false)
  }, [playlist])

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
    if (!providers.apple) return
    const ticket = generation.current
    const pending = hits.filter((hit) => {
      const key = hitKey(hit)
      if (requested.current.has(key)) return false
      requested.current.add(key)
      return true
    })
    if (pending.length === 0) return
    try {
      const result = await lookupHits(pending)
      if (ticket !== generation.current || result.skipped) return
      rememberLookup(result)
    } catch {
      if (ticket !== generation.current) return
      for (const hit of pending) requested.current.delete(hitKey(hit))
    }
  }

  useEffect(() => {
    const first = playlist.years.filter((chapter) => chapter.hits.length > 0).slice(0, 3)
    void loadHits.current(first.flatMap((chapter) => chapter.hits))
  }, [playlist, providers.apple])

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
      const response = await fetch("/api/apple/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userToken,
          name,
          description: playlistDescription(playlist.startYear, playlist.endYear),
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

  const notFoundLabel = unmatched.filter((song) => song.reason === "not_in_catalog")
  const failedLabel = unmatched.filter((song) => song.reason === "search_failed")
  const selected = selectedKey ? (playlist.hits.find((hit) => hitKey(hit) === selectedKey) ?? null) : null
  const eagerYears = new Set(
    playlist.years
      .filter((chapter) => chapter.hits.length > 0)
      .slice(0, 3)
      .map((chapter) => chapter.year),
  )

  useEffect(() => {
    if (!selected) return
    void loadHits.current([selected])
  }, [selected])

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
        <p className="summary">Every Hot 100 No. 1, in chart order.</p>
      </div>

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
        <a className="linkish" href={playlistUrl}>
          Open the saved playlist
        </a>
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
        <button type="button" aria-pressed={browse === "list"} onClick={() => setBrowse("list")}>
          List
        </button>
        <button type="button" aria-pressed={browse === "covers"} onClick={() => setBrowse("covers")}>
          Covers
        </button>
      </div>

      <div>
        {playlist.years.map((chapter) => (
          <YearBlock
            key={chapter.year}
            chapter={chapter}
            catalog={catalog}
            brokenArt={brokenArt}
            browse={browse}
            apple={providers.apple}
            eager={eagerYears.has(chapter.year)}
            onVisible={onVisible.current}
            onSelect={setSelectedKey}
            onBroken={(key) => setBrokenArt((current) => ({ ...current, [key]: true }))}
          />
        ))}
      </div>

      {selected ? (
        <SongDetail
          key={selectedKey ?? undefined}
          hit={selected}
          match={selectedKey ? (providers.apple ? catalog[selectedKey] : null) : undefined}
          canPlayFull={canPlayFull}
          onClose={() => setSelectedKey(null)}
        />
      ) : null}
    </section>
  )
}
