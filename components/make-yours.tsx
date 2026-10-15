"use client"

import { useEffect, useId, useRef, useState, type ReactNode } from "react"
import { SHARE_PAGE_REF, recipientPrompt, recipientQuestion } from "@/lib/share/recipient"
import { graduationWindow, graduationYearMessage, isValidGraduationYear } from "@/lib/playlist/window"

function YearFields({
  id,
  year,
  setYear,
  limits,
}: {
  id: string
  year: string
  setYear: (value: string) => void
  limits: { min: number; max: number }
}) {
  const typedYear = /^\d{4}$/.test(year) ? Number(year) : null
  const yearNumber = typedYear != null && isValidGraduationYear(typedYear, limits) ? typedYear : null
  const hintId = `${id}-hint`
  const hint =
    yearNumber != null
      ? `Class of ${yearNumber} includes every No. 1 from ${graduationWindow(yearNumber).startYear} through ${graduationWindow(yearNumber).endYear}.`
      : typedYear != null
        ? graduationYearMessage(typedYear, limits)
        : `Enter the year you graduated high school, from ${limits.min} through ${limits.max}.`

  function step(delta: number) {
    const base = yearNumber ?? Math.min(limits.max, Math.max(limits.min, 1984))
    const next = Math.min(limits.max, Math.max(limits.min, base + delta))
    setYear(String(next))
  }

  return (
    <>
      <div className="year-row">
        <button type="button" onClick={() => step(-1)} aria-label="Earlier graduation year" className="step">
          −
        </button>
        <input
          id={id}
          name="year"
          className="year-input"
          inputMode="numeric"
          autoComplete="off"
          aria-describedby={hintId}
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
          aria-label={id === "make-year" ? "Graduation year" : "Graduation year, after the songs"}
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
      <p id={hintId} className="hint year-hint">
        {hint}
      </p>
    </>
  )
}

export function MakeYours({
  sharedYear,
  limits,
  libraryError,
  children,
}: {
  sharedYear: number
  limits: { min: number; max: number }
  libraryError: string | null
  children: ReactNode
}) {
  const start = isValidGraduationYear(sharedYear, limits)
    ? sharedYear
    : Math.min(limits.max, Math.max(limits.min, sharedYear))
  const [year, setYear] = useState(String(start))
  const [showSticky, setShowSticky] = useState(false)
  const bannerRef = useRef<HTMLElement>(null)
  const cardRef = useRef<HTMLElement>(null)
  const bannerLabel = useId()
  const cardLabel = useId()
  const typedYear = /^\d{4}$/.test(year) ? Number(year) : null
  const yearNumber = typedYear != null && isValidGraduationYear(typedYear, limits) ? typedYear : null
  const blocked = !yearNumber || Boolean(libraryError)

  useEffect(() => {
    const banner = bannerRef.current
    const card = cardRef.current
    if (!banner || !card) return
    const mobile = window.matchMedia("(max-width: 720px)")
    let pastBanner = false
    let cardVisible = false
    const publish = () => setShowSticky(mobile.matches && pastBanner && !cardVisible)
    const watcher = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === banner) pastBanner = !entry.isIntersecting && entry.boundingClientRect.top < 0
        if (entry.target === card) cardVisible = entry.isIntersecting
      }
      publish()
    })
    watcher.observe(banner)
    watcher.observe(card)
    mobile.addEventListener("change", publish)
    return () => {
      watcher.disconnect()
      mobile.removeEventListener("change", publish)
    }
  }, [])

  return (
    <>
      <section ref={bannerRef} id="make-yours" className="make-hero" aria-labelledby={bannerLabel}>
        <p className="kicker">Your turn</p>
        <h1 id={bannerLabel}>{recipientPrompt(sharedYear)}</h1>
        <form id="make-yours-form" action="/" method="get" aria-describedby={libraryError ? "make-yours-error" : undefined}>
          <label htmlFor="make-year" className="field-label">
            {recipientQuestion()}
          </label>
          <YearFields id="make-year" year={year} setYear={setYear} limits={limits} />
          <input type="hidden" name="ref" value={SHARE_PAGE_REF} />
          {libraryError ? (
            <p id="make-yours-error" role="alert" className="alert">
              {libraryError}
            </p>
          ) : null}
          <button type="submit" className="btn btn-accent btn-block" disabled={blocked}>
            Make my playlist
          </button>
        </form>
      </section>

      {children}

      <section ref={cardRef} className="make-card" aria-labelledby={cardLabel}>
        <h2 id={cardLabel}>Make the playlist from your year.</h2>
        <p className="lede">Enter your graduation year and get the number one hits from the years that shaped you.</p>
        <form action="/" method="get">
          <label htmlFor="make-year-end" className="field-label">
            {recipientQuestion()}
          </label>
          <YearFields id="make-year-end" year={year} setYear={setYear} limits={limits} />
          <input type="hidden" name="ref" value={SHARE_PAGE_REF} />
          <button type="submit" className="btn btn-accent btn-block" disabled={blocked}>
            Make my playlist
          </button>
        </form>
      </section>

      <div className="make-sticky" hidden={!showSticky}>
        <p>
          <span className="make-sticky-kicker">Make your own</span>
          <span className="make-sticky-year">{yearNumber != null ? `Class of ${yearNumber}` : "Pick a year"}</span>
        </p>
        <button type="submit" form="make-yours-form" className="btn btn-accent" disabled={blocked}>
          Make your own
        </button>
      </div>
    </>
  )
}
