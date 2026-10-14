"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { useSearchParams } from "next/navigation"
import { generatePlaylistAction } from "@/actions/playlist-actions"
import { PlaylistDocument } from "@/components/playlist-document"
import type { BuiltPlaylist, ProviderAvailability } from "@/lib/playlist/types"
import { graduationWindow, isValidGraduationYear, MAX_GRADUATION_YEAR, MIN_GRADUATION_YEAR } from "@/lib/playlist/window"

const NOTICES: Record<string, string> = {
  spotify_denied: "Spotify sign-in was canceled.",
  spotify_expired: "Spotify sign-in expired. Try saving again.",
  spotify_failed: "Spotify sign-in did not finish. Try again.",
  spotify_unconfigured: "Spotify is not set up on this site yet.",
}

function parseYear(value: string): number | null {
  if (!/^\d{4}$/.test(value)) return null
  const year = Number(value)
  return isValidGraduationYear(year) ? year : null
}

export function TimeMachine({
  genres,
  providers,
  libraryError,
}: {
  genres: string[]
  providers: ProviderAvailability
  libraryError: string | null
}) {
  const searchParams = useSearchParams()
  const [year, setYear] = useState("")
  const [selected, setSelected] = useState<string[]>([])
  const [playlist, setPlaylist] = useState<BuiltPlaylist | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(libraryError ?? "")
  const [notice, setNotice] = useState("")
  const [autoSaveSpotify, setAutoSaveSpotify] = useState(false)
  const pendingScroll = useRef(false)

  const yearNumber = parseYear(year)
  const windowHint = yearNumber
    ? `Class of ${yearNumber} covers ${graduationWindow(yearNumber).startYear} through ${graduationWindow(yearNumber).endYear}.`
    : `Use a year from ${MIN_GRADUATION_YEAR} through ${MAX_GRADUATION_YEAR}.`

  useEffect(() => {
    const code = searchParams.get("notice")
    if (code && NOTICES[code]) setNotice(NOTICES[code])
    const raw = sessionStorage.getItem("ptm-draft")
    if (!raw) return
    try {
      const draft = JSON.parse(raw) as { playlist?: BuiltPlaylist; year?: string; genres?: string[] }
      if (draft.playlist) setPlaylist(draft.playlist)
      if (typeof draft.year === "string") setYear(draft.year)
      if (Array.isArray(draft.genres)) setSelected(draft.genres.filter((genre) => typeof genre === "string"))
      if (searchParams.get("resume") === "spotify") setAutoSaveSpotify(true)
    } catch {
      sessionStorage.removeItem("ptm-draft")
    }
  }, [searchParams])

  function step(delta: number) {
    const base = yearNumber ?? 1984
    const next = Math.min(MAX_GRADUATION_YEAR, Math.max(MIN_GRADUATION_YEAR, base + delta))
    setYear(String(next))
  }

  useEffect(() => {
    if (!playlist || !pendingScroll.current) return
    pendingScroll.current = false
    const target = document.getElementById("playlist")
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    target?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" })
  }, [playlist])

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!yearNumber) {
      setError(`Enter a graduation year from ${MIN_GRADUATION_YEAR} through ${MAX_GRADUATION_YEAR}.`)
      return
    }
    setLoading(true)
    setError("")
    setNotice("")
    try {
      const result = await generatePlaylistAction(yearNumber, selected)
      if (!result.ok) {
        setError(result.error)
        return
      }
      pendingScroll.current = true
      setPlaylist(result.playlist)
      sessionStorage.setItem(
        "ptm-draft",
        JSON.stringify({ playlist: result.playlist, year: String(yearNumber), genres: selected }),
      )
    } catch {
      setError("The playlist could not be built. Try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <a className="skip-link" href="#graduation-year">
        Skip to graduation year
      </a>
      <main className="sheet px-1 py-16 sm:py-24">
        <header className="mast">
          <p className="wordmark">Playlist Time Machine</p>
          <h1>The No. 1s from your class.</h1>
          <p className="lede">
            Enter the year you graduated. This builds every Hot 100 No. 1 from five years before that year through
            five years after, in the order they reached No. 1.
          </p>
        </header>

        <form onSubmit={onSubmit} aria-busy={loading}>
          <div>
            <label htmlFor="graduation-year" className="field-label">
              Graduation year
            </label>
            <div className="year-row">
              <button type="button" onClick={() => step(-1)} aria-label="Earlier graduation year" className="step">
                −
              </button>
              <input
                id="graduation-year"
                className="year-input"
                inputMode="numeric"
                autoComplete="off"
                placeholder="1984"
                aria-describedby="year-hint"
                value={year}
                onChange={(event) => setYear(event.target.value.replace(/[^\d]/g, "").slice(0, 4))}
              />
              <button type="button" onClick={() => step(1)} aria-label="Later graduation year" className="step">
                +
              </button>
            </div>
            <p id="year-hint" className="hint year-hint">
              {windowHint}
            </p>
          </div>

          {genres.length > 0 ? (
            <fieldset className="styles">
              <legend className="field-label">
                Styles <span>Optional</span>
              </legend>
              <p className="hint" style={{ marginTop: "0.35rem" }}>
                Leave these off to include every No. 1.
              </p>
              <div className="chips">
                {genres.map((genre) => {
                  const pressed = selected.includes(genre)
                  return (
                    <button
                      key={genre}
                      type="button"
                      aria-pressed={pressed}
                      onClick={() =>
                        setSelected((current) =>
                          current.includes(genre) ? current.filter((item) => item !== genre) : [...current, genre],
                        )
                      }
                      className="chip"
                    >
                      {genre}
                    </button>
                  )
                })}
              </div>
            </fieldset>
          ) : null}

          {notice ? (
            <p role="status" className="note">
              {notice}
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="alert">
              {error}
            </p>
          ) : null}

          <button type="submit" disabled={loading || !yearNumber || Boolean(libraryError)} className="btn btn-accent">
            {loading ? "Building the playlist" : "Build my playlist"}
          </button>
          {loading ? (
            <>
              <div className="pending" aria-hidden="true">
                <span />
              </div>
              <p role="status" className="hint" style={{ marginTop: "0.75rem", textAlign: "center" }}>
                Gathering every No. 1 from {yearNumber ? graduationWindow(yearNumber).startYear : ""} through{" "}
                {yearNumber ? graduationWindow(yearNumber).endYear : ""}.
              </p>
            </>
          ) : null}
        </form>

        {playlist ? (
          <PlaylistDocument
            playlist={playlist}
            providers={providers}
            mode="builder"
            autoSaveSpotify={autoSaveSpotify}
            onAutoSaveConsumed={() => {
              setAutoSaveSpotify(false)
              const url = new URL(window.location.href)
              url.searchParams.delete("resume")
              url.searchParams.delete("notice")
              window.history.replaceState(null, "", url.pathname)
            }}
          />
        ) : null}
      </main>
    </>
  )
}
