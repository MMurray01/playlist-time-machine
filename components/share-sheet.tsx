"use client"

import { useEffect, useId, useRef, useState } from "react"
import {
  INSTAGRAM_TIP,
  TIKTOK_TIP,
  emailShareUrl,
  facebookShareUrl,
  isAppleUserAgent,
  shareLead,
  shareMessage,
  shareSubject,
  smsShareUrl,
  storyFilename,
  whatsAppShareUrl,
  withShareUtm,
  xShareUrl,
  type ShareSource,
  type ShareTarget,
} from "@/lib/share/channels"

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError"
}

function wantsNativeShare(): boolean {
  return window.matchMedia("(pointer: coarse)").matches && typeof navigator.share === "function"
}

async function siteStoryBlob(): Promise<Blob | null> {
  const response = await fetch("/story.png")
  if (!response.ok) return null
  return response.blob()
}

export function ShareLaunch({
  target,
  year,
  resolveUrl,
  prepareImage,
  className = "btn btn-ghost",
  label = "Share",
  disabled = false,
}: {
  target: ShareTarget
  year?: number
  resolveUrl?: () => Promise<string | null>
  prepareImage?: () => Promise<Blob | null>
  className?: string
  label?: string
  disabled?: boolean
}) {
  const titleId = useId()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [note, setNote] = useState("")
  const [pageUrl, setPageUrl] = useState("")
  const [apple, setApple] = useState(false)
  const [imageUrl, setImageUrl] = useState("")
  const [imageBlob, setImageBlob] = useState<Blob | null>(null)
  const [imageNote, setImageNote] = useState("")
  const lead = shareLead(target, year)

  useEffect(() => {
    setApple(isAppleUserAgent(navigator.userAgent))
  }, [])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl)
    }
  }, [imageUrl])

  async function loadImage(): Promise<Blob | null> {
    if (imageBlob) return imageBlob
    setImageNote("Preparing the story image.")
    try {
      const blob = prepareImage ? await prepareImage() : await siteStoryBlob()
      if (!blob) {
        setImageNote("The story image could not be prepared. You can still share the link.")
        return null
      }
      setImageBlob(blob)
      setImageUrl((current) => {
        if (current) URL.revokeObjectURL(current)
        return URL.createObjectURL(blob)
      })
      setImageNote("Story image ready. 1080 by 1920.")
      return blob
    } catch {
      setImageNote("The story image could not be prepared. You can still share the link.")
      return null
    }
  }

  async function destination(): Promise<string | null> {
    if (resolveUrl) return resolveUrl()
    return `${window.location.origin}/`
  }

  async function shareNative(url: string, blob: Blob | null) {
    const title = target === "playlist" && year ? `Class of ${year}` : "Playlist Time Machine"
    const tagged = withShareUtm(url, "native")
    const text = shareMessage(target, tagged, year)
    if (blob) {
      const file = new File([blob], storyFilename(target, year), { type: "image/png" })
      const withFile: ShareData = { files: [file], title, text }
      if (navigator.canShare?.(withFile)) {
        await navigator.share(withFile)
        return
      }
    }
    await navigator.share({ title, text: lead, url: tagged })
  }

  async function openShare() {
    if (pending) return
    setPending(true)
    setNote("")
    try {
      const url = await destination()
      if (!url) {
        setNote("The share link could not be saved. Try again.")
        return
      }
      setPageUrl(url)
      if (wantsNativeShare()) {
        setNote("Preparing the story image.")
        const blob = await loadImage()
        try {
          await shareNative(url, blob)
          setNote("Shared.")
          return
        } catch (error) {
          if (isAbort(error)) {
            setNote("")
            return
          }
        }
      }
      setNote("")
      setOpen(true)
      void loadImage()
    } catch {
      setNote("Sharing did not finish. Try again.")
    } finally {
      setPending(false)
    }
  }

  function close() {
    setOpen(false)
    buttonRef.current?.focus()
  }

  async function copy(source: ShareSource, success: string) {
    if (!pageUrl) return
    const text = source === "copy" ? withShareUtm(pageUrl, source) : shareMessage(target, withShareUtm(pageUrl, source), year)
    try {
      await navigator.clipboard.writeText(text)
      setNote(success)
    } catch {
      setNote("Copy this text from the share sheet.")
    }
  }

  function downloadImage() {
    if (!imageBlob) return
    const href = imageUrl || URL.createObjectURL(imageBlob)
    const link = document.createElement("a")
    link.href = href
    link.download = storyFilename(target, year)
    document.body.appendChild(link)
    link.click()
    link.remove()
    setNote("Story image downloaded.")
  }

  function channelHref(source: ShareSource): string {
    const url = withShareUtm(pageUrl || "https://www.playlisttimemachine.com/", source)
    const text = shareMessage(target, url, year)
    if (source === "facebook") return facebookShareUrl(url)
    if (source === "x") return xShareUrl(text)
    if (source === "whatsapp") return whatsAppShareUrl(text)
    if (source === "sms" || source === "imessage") return smsShareUrl(text)
    return emailShareUrl(shareSubject(target, year), text)
  }

  return (
    <div className="share-launch">
      <button
        ref={buttonRef}
        type="button"
        className={className}
        data-share-launch={target}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-busy={pending}
        disabled={pending || disabled}
        onClick={() => void openShare()}
      >
        {pending ? "Sharing" : label}
      </button>
      {note && !open ? (
        <p role="status" className="sr-only">
          {note}
        </p>
      ) : null}
      <dialog
        ref={dialogRef}
        className="share-dialog"
        aria-labelledby={titleId}
        data-share-sheet={target}
        onClose={close}
        onClick={(event) => {
          if (event.target === dialogRef.current) close()
        }}
      >
        <div className="share-dialog-body">
          <h2 id={titleId}>Share</h2>
          <p className="share-lead">{lead}</p>
          {note ? (
            <p role="status" className="quiet">
              {note}
            </p>
          ) : null}
          <ul className="share-actions">
            <li>
              <button type="button" onClick={() => void copy("copy", "Link copied.")}>
                Copy link
              </button>
            </li>
            <li>
              <a href={channelHref("facebook")} target="_blank" rel="noopener noreferrer">
                Facebook
              </a>
            </li>
            <li>
              <a href={channelHref("x")} target="_blank" rel="noopener noreferrer">
                X
              </a>
            </li>
            <li>
              <a href={channelHref("whatsapp")} target="_blank" rel="noopener noreferrer">
                WhatsApp
              </a>
            </li>
            <li>
              <a href={channelHref("sms")}>Text</a>
            </li>
            {apple ? (
              <li>
                <a href={channelHref("imessage")}>iMessage</a>
              </li>
            ) : null}
            <li>
              <a href={channelHref("email")}>Email</a>
            </li>
          </ul>

          <section className="share-story" aria-label="Story image" aria-busy={imageBlob ? undefined : true}>
            <h3>Story image</h3>
            <p className="quiet">1080 by 1920, for Instagram and TikTok stories.</p>
            <div className="share-story-frame">
              {imageUrl ? (
                // The preview is the same PNG the download button saves.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt={`${lead} Story image, 1080 by 1920.`} width={1080} height={1920} />
              ) : (
                <p>{imageNote || "Preparing the story image."}</p>
              )}
            </div>
            <p role="status" className="quiet">
              {imageNote}
            </p>

            <div className="share-channel">
              <h4>Instagram</h4>
              <p className="quiet">{INSTAGRAM_TIP}</p>
              <div className="share-channel-actions">
                <button type="button" onClick={downloadImage} disabled={!imageBlob}>
                  Download image
                </button>
                <button type="button" onClick={() => void copy("instagram", "Caption copied.")}>
                  Copy caption
                </button>
              </div>
            </div>
            <div className="share-channel">
              <h4>TikTok</h4>
              <p className="quiet">{TIKTOK_TIP}</p>
              <div className="share-channel-actions">
                <button type="button" onClick={downloadImage} disabled={!imageBlob}>
                  Download image
                </button>
                <button type="button" onClick={() => void copy("tiktok", "Caption copied.")}>
                  Copy caption
                </button>
              </div>
            </div>
          </section>
        </div>
        <div className="share-dialog-actions">
          <button type="button" className="btn btn-ghost" onClick={close}>
            Close
          </button>
        </div>
      </dialog>
    </div>
  )
}
