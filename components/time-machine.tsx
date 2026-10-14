"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { useSearchParams } from "next/navigation"
import { generatePlaylistAction } from "@/actions/playlist-actions"
import { PlaylistDocument } from "@/components/playlist-document"
import { tokens } from "@/lib/playlist/tokens"
import { themeForYear } from "@/lib/playlist/decade"
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
  const yearTheme = themeForYear(yearNumber ?? 1980)

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
      <main className="sheet px-1 py-8 sm:py-14">
        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: tokens.burgundy }}>
            A reunion soundtrack
          </p>
          <h1 className="display mt-3 text-5xl leading-[0.95] sm:text-6xl" style={{ color: tokens.ink }}>
            The No. 1s from your class.
          </h1>
          <p className="mt-4 text-lg leading-relaxed" style={{ color: tokens.inkSoft }}>
            Type the year you graduated. You get every Billboard Hot 100 No. 1 from five years before that year
            through five years after, in the order they topped the chart.
          </p>
        </header>

        <form onSubmit={onSubmit} aria-busy={loading} className="space-y-6">
          <div>
            <label htmlFor="graduation-year" className="text-sm font-semibold" style={{ color: tokens.ink }}>
              Graduation year
            </label>
            <div className="mt-3 flex items-end gap-3">
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="Earlier graduation year"
                className="mb-3 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl"
                style={{ background: tokens.card, color: tokens.ink, border: `1px solid ${tokens.line}` }}
              >
                −
              </button>
              <input
                id="graduation-year"
                className="year-input"
                style={{ color: yearTheme.ink }}
                inputMode="numeric"
                autoComplete="off"
                placeholder="1984"
                aria-describedby="year-hint"
                value={year}
                onChange={(event) => setYear(event.target.value.replace(/[^\d]/g, "").slice(0, 4))}
              />
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="Later graduation year"
                className="mb-3 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl"
                style={{ background: tokens.card, color: tokens.ink, border: `1px solid ${tokens.line}` }}
              >
                +
              </button>
            </div>
            <p id="year-hint" className="mt-3 text-center text-sm" style={{ color: tokens.inkSoft }}>
              {windowHint}
            </p>
          </div>

          {genres.length > 0 ? (
            <fieldset>
              <legend className="text-sm font-semibold" style={{ color: tokens.ink }}>
                Styles <span style={{ color: tokens.inkSoft, fontWeight: 500 }}>Optional</span>
              </legend>
              <p className="mt-1 text-sm" style={{ color: tokens.inkSoft }}>
                Leave these off to include every No. 1.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
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
                      className="min-h-11 rounded-full px-4 text-sm font-semibold"
                      style={{
                        background: pressed ? tokens.ink : tokens.card,
                        color: pressed ? tokens.card : tokens.ink,
                        border: `1px solid ${pressed ? tokens.ink : tokens.line}`,
                      }}
                    >
                      {genre}
                    </button>
                  )
                })}
              </div>
            </fieldset>
          ) : null}

          {notice ? (
            <p role="status" className="rounded-2xl px-4 py-3 text-sm" style={{ background: tokens.card, color: tokens.ink }}>
              {notice}
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="rounded-2xl px-4 py-3 text-sm" style={{ background: tokens.dangerWash, color: tokens.dangerInk }}>
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading || !yearNumber || Boolean(libraryError)}
            className="min-h-14 w-full rounded-full text-lg font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: tokens.burgundy, color: tokens.onBurgundy }}
          >
            {loading ? "Building the playlist" : "Build my playlist"}
          </button>
          {loading ? (
            <p role="status" className="text-center text-sm" style={{ color: tokens.inkSoft }}>
              Gathering every No. 1 from {yearNumber ? graduationWindow(yearNumber).startYear : ""} through{" "}
              {yearNumber ? graduationWindow(yearNumber).endYear : ""}.
            </p>
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
