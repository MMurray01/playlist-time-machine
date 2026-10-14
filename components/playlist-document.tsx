"use client"

import { useEffect, useRef, useState } from "react"
import { sharePlaylistAction } from "@/actions/playlist-actions"
import { loadMusicKit } from "@/components/musickit"
import { themeForYear } from "@/lib/playlist/decade"
import { hitKey } from "@/lib/playlist/hits"
import { tokens } from "@/lib/playlist/tokens"
import type { BuiltPlaylist, MatchedTrack, ProviderAvailability, UnmatchedTrack } from "@/lib/playlist/types"
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

  return (
    <section id="playlist" aria-labelledby="playlist-title" className="mt-10 space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em]" style={{ color: tokens.burgundy }}>
          {playlist.hits.length} No. 1 {playlist.hits.length === 1 ? "hit" : "hits"}
        </p>
        <Title id="playlist-title" className="display mt-2 text-4xl leading-tight sm:text-5xl" style={{ color: tokens.ink }}>
          {mode === "shared" ? playlist.title : name || playlist.title}
        </Title>
        <p className="mt-3 text-base leading-relaxed" style={{ color: tokens.inkSoft }}>
          {playlist.startYear} through {playlist.endYear}, in the order they topped the chart.
          {playlist.genres.length > 0 ? ` Styles: ${playlist.genres.join(", ")}.` : " Every style is included."}
        </p>
      </div>

      <div className="space-y-3 rounded-3xl p-4 sm:p-5" style={{ background: tokens.card, border: `1px solid ${tokens.line}` }}>
        {mode === "builder" ? (
          <div>
            <label htmlFor="playlist-name" className="text-sm font-semibold" style={{ color: tokens.ink }}>
              Playlist name
            </label>
            <input
              id="playlist-name"
              value={name}
              onChange={(event) => setName(event.target.value.slice(0, 80))}
              maxLength={80}
              className="mt-2 w-full rounded-2xl border px-4 py-3 text-base"
              style={{ borderColor: tokens.line, background: tokens.paper, color: tokens.ink }}
            />
          </div>
        ) : null}

        <div className="grid gap-3">
          <button
            type="button"
            onClick={() => void saveSpotify()}
            disabled={busy || !providers.spotify || playlist.hits.length === 0}
            className="min-h-12 rounded-full px-5 text-base font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: tokens.spotify, color: tokens.onSpotify }}
          >
            Save to Spotify
          </button>
          {!providers.spotify ? (
            <p className="text-sm" style={{ color: tokens.inkSoft }}>
              Spotify is not set up on this site yet.
            </p>
          ) : null}
          {providers.apple ? (
            <button
              type="button"
              onClick={() => void saveApple()}
              disabled={busy || playlist.hits.length === 0}
              className="min-h-12 rounded-full px-5 text-base font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: tokens.apple, color: tokens.onApple }}
            >
              Save to Apple Music
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void share()}
            disabled={busy || playlist.hits.length === 0}
            className="min-h-12 rounded-full border px-5 text-base font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            style={{ borderColor: tokens.ink, color: tokens.ink, background: "transparent" }}
          >
            Share
          </button>
        </div>

        <p role="status" aria-live="polite" className="text-sm" style={{ color: tokens.inkSoft }}>
          {coverNote || status}
        </p>
        {error ? (
          <p role="alert" className="rounded-2xl px-4 py-3 text-sm" style={{ background: tokens.dangerWash, color: tokens.dangerInk }}>
            {error}
          </p>
        ) : null}
        {playlistUrl ? (
          <a className="inline-block text-sm font-semibold underline" style={{ color: tokens.ink }} href={playlistUrl}>
            Open the saved playlist
          </a>
        ) : null}
        {shareUrl ? (
          <p className="break-all text-sm">
            <a href={shareUrl} style={{ color: tokens.ink }} className="font-semibold underline">
              {shareUrl}
            </a>
          </p>
        ) : null}
        {notFoundLabel.length > 0 ? (
          <details>
            <summary className="cursor-pointer text-sm font-semibold">
              {notFoundLabel.length} {notFoundLabel.length === 1 ? "song was" : "songs were"} not in the catalog
            </summary>
            <ul className="mt-2 space-y-1 text-sm" style={{ color: tokens.inkSoft }}>
              {notFoundLabel.map((song) => (
                <li key={song.key}>
                  {song.title} by {song.artist}
                </li>
              ))}
            </ul>
          </details>
        ) : null}
        {failedLabel.length > 0 ? (
          <p className="text-sm" style={{ color: tokens.inkSoft }}>
            {failedLabel.length} {failedLabel.length === 1 ? "song could" : "songs could"} not be checked. Try saving again.
          </p>
        ) : null}
      </div>

      <nav aria-label="Years in this playlist" className="year-jump">
        {playlist.years.map((chapter) => (
          <a key={chapter.year} href={`#year-${chapter.year}`}>
            {chapter.year}
          </a>
        ))}
      </nav>

      <div className="space-y-5">
        {playlist.years.map((chapter) => {
          const theme = themeForYear(chapter.year)
          return (
            <article
              key={chapter.year}
              id={`year-${chapter.year}`}
              className="scroll-mt-4 rounded-3xl p-4 sm:p-5"
              style={{ background: theme.wash, color: theme.ink, boxShadow: `inset 6px 0 0 ${theme.stripe}` }}
            >
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="display text-4xl">{chapter.year}</h3>
                <p className="text-sm font-semibold">
                  {theme.label} · {chapter.hits.length} No. 1{chapter.hits.length === 1 ? "" : "s"}
                </p>
              </div>
              {chapter.story.editorial ? <p className="mt-3 text-base leading-relaxed">{chapter.story.editorial}</p> : null}
              <p className="mt-3 text-base leading-relaxed">{chapter.story.summary}</p>
              {chapter.hits.length > 0 ? (
                <ol className="mt-4 divide-y" style={{ borderColor: theme.stripe }}>
                  {chapter.hits.map((hit) => {
                    const key = hitKey(hit)
                    const art = artwork[key]
                    const weeks = weeksLabel(hit.weeksAtNumberOne)
                    return (
                      <li key={key} className="flex items-center gap-3 py-3">
                        {art && !brokenArt[key] ? (
                          // Provider artwork hosts vary, so this stays a plain image.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={art}
                            alt=""
                            width={56}
                            height={56}
                            className="cover"
                            onError={() => setBrokenArt((current) => ({ ...current, [key]: true }))}
                          />
                        ) : (
                          <span
                            aria-hidden="true"
                            className="cover inline-flex items-center justify-center text-sm font-semibold"
                            style={{ background: theme.stripe, color: "#fffdf8" }}
                          >
                            {initials(hit.title)}
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold leading-tight">{hit.title}</p>
                          <p className="truncate text-sm leading-tight">{hit.artist}</p>
                          {weeks ? <p className="text-xs leading-tight">{weeks}</p> : null}
                        </div>
                      </li>
                    )
                  })}
                </ol>
              ) : null}
            </article>
          )
        })}
      </div>
    </section>
  )
}
