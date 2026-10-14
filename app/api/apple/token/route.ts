import { NextResponse } from "next/server"
import { readAppleMusicCredentials, signAppleDeveloperToken } from "@/lib/providers/apple-token"

let cached: { token: string; expiresAt: number } | null = null

export async function GET() {
  const credentials = readAppleMusicCredentials()
  if (!credentials) {
    return NextResponse.json({ enabled: false }, { status: 404 })
  }

  if (!cached || cached.expiresAt < Date.now() + 60_000) {
    try {
      const token = await signAppleDeveloperToken({ ...credentials, expiresIn: "1d" })
      cached = { token, expiresAt: Date.now() + 23 * 60 * 60 * 1000 }
    } catch (error) {
      console.error("Apple developer token failed", error instanceof Error ? error.message : "unknown")
      return NextResponse.json({ enabled: false, error: "Apple Music is not available right now." }, { status: 500 })
    }
  }

  return NextResponse.json(
    { enabled: true, developerToken: cached.token },
    { headers: { "Cache-Control": "private, max-age=3600" } },
  )
}
