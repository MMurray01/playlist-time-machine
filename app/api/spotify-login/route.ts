import type { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const authUrl = searchParams.get("auth_url")

    if (!authUrl) {
      return new Response("Missing auth_url parameter", { status: 400 })
    }

    // Validate the URL to ensure it's a Spotify URL
    try {
      const url = new URL(authUrl)
      if (!url.hostname.includes("spotify.com")) {
        return new Response("Invalid auth URL", { status: 400 })
      }
    } catch {
      return new Response("Invalid auth URL format", { status: 400 })
    }

    // Return a redirect response
    return Response.redirect(authUrl, 302)
  } catch (error) {
    console.error("Error in spotify-login route:", error)
    return new Response("Internal server error", { status: 500 })
  }
}
