import { NextResponse } from "next/server"
import { appleLibraryPlaylistDescription } from "@/lib/playlist/apple-library"
import { parseShareBody, playlistShareCopy, shareErrorStatus, shareFailureHeaders } from "@/lib/playlist/ios-api"
import { graduationWindow } from "@/lib/playlist/window"
import { createSharedPlaylist } from "@/lib/server/share"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: Request) {
  const raw = await request.text()
  if (raw.length > 8_000) {
    return NextResponse.json({ ok: false, error: "The share request was too large." }, { status: 400 })
  }

  let body: unknown
  try {
    body = raw ? JSON.parse(raw) : null
  } catch {
    return NextResponse.json({ ok: false, error: "The share request was empty." }, { status: 400 })
  }

  const parsed = parseShareBody(body)
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 })
  }

  const created = await createSharedPlaylist({
    graduationYear: parsed.graduationYear,
    genres: parsed.genres,
    title: parsed.title,
  })
  if (!created.ok) {
    const status = created.status ?? shareErrorStatus(created.error)
    return NextResponse.json(
      { ok: false, error: created.error },
      { status, headers: shareFailureHeaders(status, created.retryAfterSeconds) },
    )
  }

  const window = graduationWindow(parsed.graduationYear)
  const share = playlistShareCopy(created.id, created.url, parsed.graduationYear)
  return NextResponse.json({
    ok: true,
    id: share.id,
    url: share.url,
    shareUrl: share.shareUrl,
    message: share.message,
    subject: share.subject,
    libraryDescription: appleLibraryPlaylistDescription(window.startYear, window.endYear, share.url),
  })
}
