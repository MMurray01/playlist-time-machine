"use client"

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import { generatePlaylistAction } from "@/actions/playlist-actions"
import { FromSpotify } from "@/components/from-spotify"
import { PlaylistDocument } from "@/components/playlist-document"
import type { BuiltPlaylist, ProviderAvailability } from "@/lib/playlist/types"
import {
  currentCalendarYear,
  graduationWindow,
  graduationYearLimits,
  graduationYearMessage,
  isValidGraduationYear,
} from "@/lib/playlist/window"

export function TimeMachine({
  providers,
  libraryError,
  chartMinYear,
  chartMaxYear,
  affiliateToken = null,
}: {
  providers: ProviderAvailability
  libraryError: string | null
  chartMinYear: number | null
  chartMaxYear: number | null
  affiliateToken?: string | null
}) {
  const limits = useMemo(
    () => graduationYearLimits({ chartMinYear, chartMaxYear }),
    [chartMinYear, chartMaxYear],
  )
  const [year, setYear] = useState("")
  const [playlist, setPlaylist] = useState<BuiltPlaylist | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(libraryError ?? "")
  const pendingScroll = useRef(false)

  const typedYear = /^\d{4}$/.test(year) ? Number(year) : null
  const yearNumber = typedYear != null && isValidGraduationYear(typedYear, limits) ? typedYear : null
  const windowHint =
    yearNumber != null
      ? `Class of ${yearNumber} includes every No. 1 from ${graduationWindow(yearNumber).startYear} through ${graduationWindow(yearNumber).endYear}.`
      : typedYear != null
        ? graduationYearMessage(typedYear, limits, currentCalendarYear())
        : `Enter the year you graduated high school, from ${limits.min} through ${limits.max}.`

  useEffect(() => {
    const raw = sessionStorage.getItem("ptm-draft")
    if (!raw) return
    try {
      const draft = JSON.parse(raw) as { playlist?: BuiltPlaylist; year?: string }
      if (typeof draft.year === "string" && isValidGraduationYear(Number(draft.year), limits)) {
        setYear(draft.year)
        if (draft.playlist) setPlaylist(draft.playlist)
      }
    } catch {
      sessionStorage.removeItem("ptm-draft")
    }
  }, [limits])

  function step(delta: number) {
    const base = yearNumber ?? Math.min(limits.max, Math.max(limits.min, 1984))
    const next = Math.min(limits.max, Math.max(limits.min, base + delta))
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
    if (typedYear != null && yearNumber == null) {
      setError(graduationYearMessage(typedYear, limits, currentCalendarYear()))
      return
    }
    if (!yearNumber) {
      setError(`Enter the year you graduated high school, from ${limits.min} through ${limits.max}.`)
      return
    }
    setLoading(true)
    setError("")
    try {
      const result = await generatePlaylistAction(yearNumber)
      if (!result.ok) {
        setPlaylist(null)
        setError(result.error)
        return
      }
      pendingScroll.current = true
      setPlaylist(result.playlist)
      sessionStorage.setItem("ptm-draft", JSON.stringify({ playlist: result.playlist, year: String(yearNumber) }))
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
      <main className="sheet sheet-screen px-1 py-16 sm:py-24">
        <header className="mast">
          <p className="wordmark">Playlist Time Machine</p>
          <h1>Rediscover the soundtrack of your life</h1>
          <p className="lede">
            Your first dance, graduation, those long summer nights. Enter your high school graduation year and get
            the number one hits from the eleven years that shaped you, the popular songs of the time.
          </p>
        </header>

        <form onSubmit={onSubmit} aria-busy={loading}>
          <div>
            <label htmlFor="graduation-year" className="field-label">
              What year did you graduate high school?
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
                aria-describedby="year-hint"
                aria-invalid={typedYear != null && yearNumber == null}
                min={limits.min}
                max={limits.max}
                value={year}
                onChange={(event) => setYear(event.target.value.replace(/[^\d]/g, "").slice(0, 4))}
              />
              <button type="button" onClick={() => step(1)} aria-label="Later graduation year" className="step">
                +
              </button>
            </div>
            <div className="year-slider">
              <input
                type="range"
                min={limits.min}
                max={limits.max}
                step={1}
                value={yearNumber ?? limits.min}
                aria-label="Graduation year"
                aria-valuemin={limits.min}
                aria-valuemax={limits.max}
                aria-valuenow={yearNumber ?? limits.min}
                aria-valuetext={yearNumber != null ? String(yearNumber) : "No year selected"}
                onChange={(event) => setYear(event.target.value)}
              />
              <div className="year-ends">
                <span>{limits.min}</span>
                <span>{limits.max}</span>
              </div>
            </div>
            <p id="year-hint" className="hint year-hint">
              {windowHint}
            </p>
          </div>

          {error ? (
            <p role="alert" className="alert">
              {error}
            </p>
          ) : null}

          <button type="submit" disabled={loading || !yearNumber || Boolean(libraryError)} className="btn btn-accent btn-block">
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

        <FromSpotify compact affiliateToken={affiliateToken} />

        {playlist ? (
          <PlaylistDocument
            playlist={playlist}
            providers={providers}
            mode="builder"
            affiliateToken={affiliateToken}
          />
        ) : null}
      </main>
    </>
  )
}
