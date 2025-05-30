import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")

  // The client-side dedicated callback path
  const clientCallbackHandlerUrl = new URL("/app-spotify-auth-callback", request.nextUrl.origin)

  if (error) {
    console.error("Spotify callback error:", error)
    clientCallbackHandlerUrl.searchParams.set("error", error)
    if (state) clientCallbackHandlerUrl.searchParams.set("state", state) // Pass state back for CSRF check
    return NextResponse.redirect(clientCallbackHandlerUrl.toString())
  }

  if (code && state) {
    clientCallbackHandlerUrl.searchParams.set("code", code)
    clientCallbackHandlerUrl.searchParams.set("state", state)
    return NextResponse.redirect(clientCallbackHandlerUrl.toString())
  }

  // Fallback or error if no code/error from Spotify
  console.error("Invalid parameters from Spotify callback.")
  clientCallbackHandlerUrl.searchParams.set("error", "invalid_spotify_callback")
  return NextResponse.redirect(clientCallbackHandlerUrl.toString())
}
