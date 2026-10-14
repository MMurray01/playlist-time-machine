"use client"

import { useEffect, useRef, useState } from "react"
import { sharePlaylistAction } from "@/actions/playlist-actions"
import { loadMusicKit } from "@/components/musickit"
import { hitKey } from "@/lib/playlist/hits"
import type { BuiltPlaylist, ChartHit, MatchedTrack, ProviderAvailability, UnmatchedTrack } from "@/lib/playlist/types"
import { playlistDescription } from "@/lib/playlist/window"

type LookupResult = {
  matches: MatchedTrack[]
  unmatched: UnmatchedTrack[]
  skipped?: boolean
  needsAuth?: boolean
}

async function lookupProvider(
  provider: "spotify" | "apple",
  playlist: BuiltPlaylist,
  intent: "preview" | "save",
  onChunk?: (done: number, total: number) => void,
): Promise<LookupResult> {
  const matches: MatchedTrack[] = []
  const unmatched: UnmatchedTrack[] = []
  const total = playlist.hits.length
  for (let index = 0; index < total; index += 20) {
    const slice = playlist.hits.slice(index, index + 20)
    const response = await fetch("/api/providers/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider,
        intent,
        tracks: slice.map((hit) => ({
          key: hitKey(hit),
          title: hit.title,
          artist: hit.artist,
          spotifyTrackId: hit.spotifyTrackId,
        })),
      }),
    })
    if (response.status === 401) return { matches, unmatched, needsAuth: true }
    if (!response.ok) throw new Error("lookup")
    const body = (await response.json()) as LookupResult & { skipped?: boolean }
    if (body.skipped) return { matches, unmatched, skipped: true }
    matches.push(...(body.matches ?? []))
    unmatched.push(...(body.unmatched ?? []))
    onChunk?.(Math.min(index + slice.length, total), total)
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
  broken,
  onError,
}: {
  hit: ChartHit
  art: string | undefined
  broken: boolean
  onError: () => void
}) {
  if (art && !broken) {
    return (
      // Provider artwork hosts vary, so this stays a plain image.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={art} alt="" width={640} height={640} className="cover" onError={onError} />
    )
  }
  return (
    <span aria-hidden="true" className="cover cover-fallback">
      {initials(hit.title)}
    </span>
  )
}

export function PlaylistDocument({
  playlist,
  providers,
  mode,
  autoSaveSpotify = false,
  onAutoSaveConsumed,
}: {
  playlist: BuiltPlaylist
  providers: ProviderAvailability
  mode: "builder" | "shared"
  autoSaveSpotify?: boolean
  onAutoSaveConsumed?: () => void
}) {
  const [name, setName] = useState(playlist.title)
  const [artwork, setArtwork] = useState<Record<string, string>>({})
  const [brokenArt, setBrokenArt] = useState<Record<string, true>>({})
  const [status, setStatus] = useState("")
  const [error, setError] = useState("")
  const [playlistUrl, setPlaylistUrl] = useState("")
  const [shareUrl, setShareUrl] = useState(mode === "shared" ? "" : "")
  const [unmatched, setUnmatched] = useState<UnmatchedTrack[]>([])
  const [busy, setBusy] = useState(false)
  const [coverNote, setCoverNote] = useState("")
  const autoSaveStarted = useRef(false)
  const titleTag = mode === "shared" ? "h1" : "h2"
  const Title = titleTag

  useEffect(() => {
    setName(playlist.title)
    setArtwork({})
    setBrokenArt({})
    setUnmatched([])
    setPlaylistUrl("")
    setShareUrl("")
    setError("")
    setStatus("")
  }, [playlist])

  useEffect(() => {
    const provider = providers.spotifyCatalog ? "spotify" : providers.apple ? "apple" : null
    if (!provider) return
    let cancelled = false
    setCoverNote(provider === "spotify" ? "Adding album covers from Spotify." : "Adding album covers from Apple Music.")
    void lookupProvider(provider, playlist, "preview", (done, total) => {
      if (!cancelled) setCoverNote(`Adding album covers, ${done} of ${total}.`)
    })
      .then((result) => {
        if (cancelled || result.skipped || result.needsAuth) return
        const next: Record<string, string> = {}
        for (const match of result.matches) {
          if (match.artworkUrl) next[match.key] = match.artworkUrl
        }
        setArtwork((current) => ({ ...current, ...next }))
      })
      .catch(() => {
        if (!cancelled) setCoverNote("")
      })
      .finally(() => {
        if (!cancelled) setCoverNote("")
      })
    return () => {
      cancelled = true
    }
  }, [playlist, providers.apple, providers.spotifyCatalog])

  async function saveSpotify() {
    if (busy) return
    setBusy(true)
    setError("")
    setStatus("Checking Spotify for these songs.")
    setUnmatched([])
    try {
      const lookup = await lookupProvider("spotify", playlist, "save", (done, total) => {
        setStatus(`Checking Spotify, ${done} of ${total}.`)
      })
      if (lookup.needsAuth) {
        sessionStorage.setItem(
          "ptm-draft",
          JSON.stringify({ playlist, year: String(playlist.graduationYear), genres: playlist.genres }),
        )
        window.location.href = "/api/spotify/login?next=/"
        return
      }
      const art: Record<string, string> = {}
      for (const match of lookup.matches) {
        if (match.artworkUrl) art[match.key] = match.artworkUrl
      }
      setArtwork((current) => ({ ...current, ...art }))
      setUnmatched(lookup.unmatched)
      if (lookup.matches.length === 0) {
        setStatus("")
        setError("None of these songs were found on Spotify.")
        setBusy(false)
        return
      }
      setStatus(`Saving ${lookup.matches.length} songs to Spotify.`)
      const response = await fetch("/api/spotify/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: playlistDescription(playlist.startYear, playlist.endYear),
          trackIds: lookup.matches.map((match) => match.catalogId),
        }),
      })
      const body = (await response.json()) as {
        ok?: boolean
        error?: string
        playlistUrl?: string | null
        addedCount?: number
        requestedCount?: number
      }
      if (response.status === 401) {
        sessionStorage.setItem(
          "ptm-draft",
          JSON.stringify({ playlist, year: String(playlist.graduationYear), genres: playlist.genres }),
        )
        window.location.href = "/api/spotify/login?next=/"
        return
      }
      if (!response.ok || !body.ok) {
        setError(body.error || "Spotify could not save the playlist.")
        setStatus(
          typeof body.addedCount === "number"
            ? `Spotify kept ${body.addedCount} of ${body.requestedCount ?? lookup.matches.length} songs.`
            : "",
        )
      } else {
        setPlaylistUrl(body.playlistUrl || "")
        setStatus(
          `Saved ${body.addedCount ?? lookup.matches.length} of ${playlist.hits.length} songs to a private Spotify playlist.`,
        )
      }
    } catch {
      setError("Spotify could not be reached. Try again.")
      setStatus("")
    } finally {
      setBusy(false)
    }
  }

  async function saveApple() {
    if (busy) return
    setBusy(true)
    setError("")
    setStatus("Checking Apple Music for these songs.")
    setUnmatched([])
    try {
      const lookup = await lookupProvider("apple", playlist, "save", (done, total) => {
        setStatus(`Checking Apple Music, ${done} of ${total}.`)
      })
      const art: Record<string, string> = {}
      for (const match of lookup.matches) {
        if (match.artworkUrl) art[match.key] = match.artworkUrl
      }
      setArtwork((current) => ({ ...current, ...art }))
      setUnmatched(lookup.unmatched)
      if (lookup.skipped) {
        setError("Apple Music is not set up on this site.")
        setStatus("")
        setBusy(false)
        return
      }
      if (lookup.matches.length === 0) {
        setError("None of these songs were found on Apple Music.")
        setStatus("")
        setBusy(false)
        return
      }
      setStatus("Opening Apple Music so you can approve the playlist.")
      const tokenResponse = await fetch("/api/apple/token")
      if (!tokenResponse.ok) {
        setError("Apple Music is not available right now.")
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
      setStatus(`Saving ${lookup.matches.length} songs to Apple Music.`)
      const response = await fetch("/api/apple/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userToken,
          name,
          description: playlistDescription(playlist.startYear, playlist.endYear),
          trackIds: lookup.matches.map((match) => match.catalogId),
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
        setStatus(
          typeof body.addedCount === "number" ? `Apple Music kept ${body.addedCount} songs.` : "",
        )
      } else {
        setPlaylistUrl(body.playlistUrl || "")
        setStatus(`Saved ${body.addedCount ?? lookup.matches.length} of ${playlist.hits.length} songs to Apple Music.`)
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

  useEffect(() => {
    if (!autoSaveSpotify || autoSaveStarted.current) return
    autoSaveStarted.current = true
    onAutoSaveConsumed?.()
    void saveSpotify()
    // The resume flag should start one save after Spotify returns.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSaveSpotify])

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
        genres: playlist.genres,
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

  const opening = playlist.hits.slice(0, 3)
  const actionClass = providers.apple ? "actions actions-split" : "actions"

  return (
    <section id="playlist" aria-labelledby="playlist-title" className="results">
      <div className="playlist-head">
        <p className="kicker">{playlist.hits.length === 1 ? "1 song" : `${playlist.hits.length} songs`}</p>
        <Title id="playlist-title">{mode === "shared" ? playlist.title : name || playlist.title}</Title>
        <p className="summary">
          {playlist.startYear} through {playlist.endYear}, in chart order.
          {playlist.genres.length > 0 ? ` Styles: ${playlist.genres.join(", ")}.` : " Every style is included."}
        </p>
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

      <div className={actionClass}>
        <button
          type="button"
          onClick={() => void saveSpotify()}
          disabled={busy || !providers.spotify || playlist.hits.length === 0}
          className="btn btn-ink"
        >
          Save to Spotify
        </button>
        {providers.apple ? (
          <button
            type="button"
            onClick={() => void saveApple()}
            disabled={busy || playlist.hits.length === 0}
            className="btn btn-ink"
          >
            Save to Apple Music
          </button>
        ) : null}
        <button type="button" onClick={() => void share()} disabled={busy || playlist.hits.length === 0} className="btn btn-ghost">
          Share
        </button>
      </div>
      {!providers.spotify ? <p className="quiet" style={{ marginTop: "0.7rem" }}>Spotify is not set up on this site yet.</p> : null}

      <p role="status" aria-live="polite" className="quiet" style={{ marginTop: "0.85rem" }}>
        {coverNote || status}
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

      {opening.length > 0 ? (
        <div className="lead-art" aria-hidden="true">
          {opening.map((hit) => {
            const key = hitKey(hit)
            return (
              <figure key={key}>
                <Cover
                  hit={hit}
                  art={artwork[key]}
                  broken={Boolean(brokenArt[key])}
                  onError={() => setBrokenArt((current) => ({ ...current, [key]: true }))}
                />
                <figcaption>
                  <p className="lead-title">{hit.title}</p>
                  <p className="lead-artist">{hit.artist}</p>
                </figcaption>
              </figure>
            )
          })}
        </div>
      ) : null}

      <div>
        {playlist.years.map((chapter) => (
          <article key={chapter.year} id={`year-${chapter.year}`} className="year-block">
            <div className="year-heading">
              <h3>{chapter.year}</h3>
              <p className="quiet">
                {chapter.hits.length} {chapter.hits.length === 1 ? "song" : "songs"}
              </p>
            </div>
            {chapter.story.editorial ? <p className="story">{chapter.story.editorial}</p> : null}
            <p className="story">{chapter.story.summary}</p>
            {chapter.hits.length > 0 ? (
              <ol className="tracks">
                {chapter.hits.map((hit) => {
                  const key = hitKey(hit)
                  const weeks = weeksLabel(hit.weeksAtNumberOne)
                  return (
                    <li key={key} className="track">
                      <Cover
                        hit={hit}
                        art={artwork[key]}
                        broken={Boolean(brokenArt[key])}
                        onError={() => setBrokenArt((current) => ({ ...current, [key]: true }))}
                      />
                      <div>
                        <p className="track-title">{hit.title}</p>
                        <p className="track-meta">
                          {hit.artist}
                          {weeks ? ` · ${weeks}` : ""}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ol>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  )
}
