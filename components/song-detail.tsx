"use client"

import { useEffect, useRef, useState } from "react"
import { AppleMusicBadge } from "@/components/apple-badge"
import { loadMusicKit } from "@/components/musickit"
import type { AffiliatePlacement } from "@/lib/affiliate"
import type { ChartHit, MatchedTrack } from "@/lib/playlist/types"

export function SongDetail({
  hit,
  match,
  canPlayFull,
  onClose,
  onPreview,
  affiliateToken = null,
  placement,
}: {
  hit: ChartHit
  match: MatchedTrack | null | undefined
  canPlayFull: boolean
  onClose: () => void
  onPreview?: () => void
  affiliateToken?: string | null
  placement: AffiliatePlacement
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const [playing, setPlaying] = useState(false)
  const [fullStatus, setFullStatus] = useState("")
  const art = match?.artworkLargeUrl || match?.artworkUrl
  const previewUrl = match?.previewUrl

  useEffect(() => {
    const dialog = dialogRef.current
    const audio = audioRef.current
    if (!dialog) return
    const onNativeClose = () => {
      const pending = Number(dialog.dataset.suppressClose || 0)
      if (pending > 0) {
        if (pending === 1) delete dialog.dataset.suppressClose
        else dialog.dataset.suppressClose = String(pending - 1)
        return
      }
      onCloseRef.current()
    }
    dialog.addEventListener("close", onNativeClose)
    if (!dialog.open) dialog.showModal()
    return () => {
      dialog.removeEventListener("close", onNativeClose)
      audio?.pause()
      if (dialog.open) {
        dialog.dataset.suppressClose = String(Number(dialog.dataset.suppressClose || 0) + 1)
        dialog.close()
      }
    }
  }, [])

  async function togglePreview() {
    const audio = audioRef.current
    if (!audio || !previewUrl) return
    if (playing) {
      audio.pause()
      setPlaying(false)
      return
    }
    try {
      onPreview?.()
      await audio.play()
      setPlaying(true)
    } catch {
      setPlaying(false)
    }
  }

  async function playFull() {
    if (!match?.catalogId) return
    setFullStatus("Opening the full song in Apple Music.")
    try {
      const tokenResponse = await fetch("/api/apple/token")
      if (!tokenResponse.ok) {
        setFullStatus("Full playback needs Apple Music on this site.")
        return
      }
      const tokenBody = (await tokenResponse.json()) as { developerToken?: string }
      if (!tokenBody.developerToken) {
        setFullStatus("Full playback needs Apple Music on this site.")
        return
      }
      await loadMusicKit()
      if (!window.MusicKit) throw new Error("musickit")
      const music = await window.MusicKit.configure({
        developerToken: tokenBody.developerToken,
        app: { name: "Playlist Time Machine", build: "2.0.0" },
      })
      if (!music.isAuthorized) {
        setFullStatus("Sign in with Save to Apple Music to play the full song.")
        return
      }
      audioRef.current?.pause()
      setPlaying(false)
      if (music.setQueue) await music.setQueue({ song: match.catalogId })
      await music.play?.()
      setFullStatus("Playing in Apple Music.")
    } catch {
      setFullStatus("The full song could not be played.")
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="song-dialog"
      aria-labelledby="song-detail-title"
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose()
      }}
    >
      <div className="song-dialog-body">
        {art ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={art} alt="" width={800} height={800} className="cover cover-detail" />
        ) : (
          <span aria-hidden="true" className="cover cover-detail cover-fallback">
            {hit.title
              .replace(/[^A-Za-z0-9 ]/g, " ")
              .trim()
              .split(/\s+/)
              .slice(0, 2)
              .map((word) => word[0]?.toUpperCase() ?? "")
              .join("") || "1"}
          </span>
        )}
        <h2 id="song-detail-title">{hit.title}</h2>
        <p className="quiet">{hit.artist}</p>
      </div>
      <div className="song-dialog-actions">
        {previewUrl ? (
          <>
            <audio ref={audioRef} src={previewUrl} preload="none" onEnded={() => setPlaying(false)} />
            <button type="button" className="btn btn-accent song-play" onClick={() => void togglePreview()}>
              {playing ? "Pause preview" : "Play 30-second preview"}
            </button>
          </>
        ) : (
          <p className="quiet">{match === undefined ? "Looking up a preview." : "This song has no preview."}</p>
        )}
        <AppleMusicBadge
          url={match?.url}
          title={hit.title}
          artist={hit.artist}
          placement={placement}
          affiliateToken={affiliateToken}
        />
        {canPlayFull && match?.catalogId ? (
          <button type="button" className="btn btn-ghost song-play" onClick={() => void playFull()}>
            Play the full song
          </button>
        ) : null}
        {fullStatus ? (
          <p className="quiet" role="status">
            {fullStatus}
          </p>
        ) : null}
        <button type="button" className="btn btn-ghost song-play" onClick={onClose}>
          Close
        </button>
      </div>
    </dialog>
  )
}
