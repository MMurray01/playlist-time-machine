import type { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code } = body

    if (!code) {
      return Response.json({ error: "Missing code parameter" }, { status: 400 })
    }

    const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID
    if (!clientId) {
      return Response.json({ error: "Spotify client ID not configured" }, { status: 500 })
    }

    const redirectUri = `${request.nextUrl.origin}/api/spotify-callback`

    console.log("Exchanging code for token:", { clientId, redirectUri })

    // Exchange code for token with Spotify
    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
      }),
    })

    const responseText = await tokenResponse.text()
    console.log("Spotify token response:", { status: tokenResponse.status, body: responseText })

    if (!tokenResponse.ok) {
      console.error("Spotify token exchange failed:", responseText)
      return Response.json(
        { error: `Token exchange failed: ${tokenResponse.status} ${tokenResponse.statusText}`, details: responseText },
        { status: tokenResponse.status },
      )
    }

    let tokenData
    try {
      tokenData = JSON.parse(responseText)
    } catch (parseError) {
      console.error("Failed to parse token response:", parseError)
      return Response.json({ error: "Invalid response from Spotify" }, { status: 500 })
    }

    return Response.json(tokenData)
  } catch (error) {
    console.error("Error in spotify-token route:", error)
    return Response.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
