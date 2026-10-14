import { NextRequest, NextResponse } from "next/server"
import { createAppleMusicPlaylist } from "@/lib/providers/apple"
import { readAppleMusicCredentials, signAppleDeveloperToken } from "@/lib/providers/apple-token"
import { clipTitle } from "@/lib/playlist/window"

const APPLE_ID = /^[A-Za-z0-9.]{2,40}$/

export async function POST(request: NextRequest) {
  const credentials = readAppleMusicCredentials()
  if (!credentials) {
    return NextResponse.json({ error: "Apple Music is not set up on this site." }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "The save request was empty." }, { status: 400 })
  }

  const record = body as Record<string, unknown>
  const userToken = typeof record.userToken === "string" ? record.userToken : ""
  const name = clipTitle(typeof record.name === "string" ? record.name : "")
  const description = typeof record.description === "string" ? record.description.slice(0, 300) : ""
  const trackIds = Array.isArray(record.trackIds) ? record.trackIds : []

  if (!userToken || userToken.length > 4000) {
    return NextResponse.json({ error: "Connect Apple Music to save this playlist." }, { status: 401 })
  }
  if (!name || trackIds.length === 0 || trackIds.length > 500) {
    return NextResponse.json({ error: "Choose a playlist before saving." }, { status: 400 })
  }
  if (!trackIds.every((id) => typeof id === "string" && APPLE_ID.test(id))) {
    return NextResponse.json({ error: "Some Apple Music songs were not valid." }, { status: 400 })
  }

  let developerToken: string
  try {
    developerToken = await signAppleDeveloperToken(credentials)
  } catch {
    return NextResponse.json({ error: "Apple Music is not available right now." }, { status: 500 })
  }

  const result = await createAppleMusicPlaylist(fetch, {
    developerToken,
    userToken,
    name,
    description,
    songIds: trackIds as string[],
  })

  return NextResponse.json(
    {
      ok: result.ok,
      playlistUrl: result.playlistUrl,
      addedCount: result.addedCount,
      requestedCount: result.requestedCount,
      error: result.error,
    },
    { status: result.ok ? 200 : 502 },
  )
}
