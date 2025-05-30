import type { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")

    const baseUrl = request.nextUrl.origin

    // Handle error from Spotify
    if (error) {
      console.error("Spotify OAuth error:", error)
      return Response.redirect(`${baseUrl}/callback?error=${encodeURIComponent(error)}`, 302)
    }

    // Validate required parameters
    if (!code || !state) {
      console.error("Missing OAuth parameters:", { code: !!code, state: !!state })
      return Response.redirect(`${baseUrl}/callback?error=missing_params`, 302)
    }

    // Redirect back to the app with the code and state as query parameters
    return Response.redirect(
      `${baseUrl}/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
      302,
    )
  } catch (error) {
    console.error("Error in spotify-callback route:", error)
    return Response.redirect(`${request.nextUrl.origin}/callback?error=server_error`, 302)
  }
}
