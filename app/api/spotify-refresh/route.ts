import type { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { refresh_token } = body

    if (!refresh_token) {
      return Response.json({ error: "Missing refresh_token parameter" }, { status: 400 })
    }

    const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID
    if (!clientId) {
      return Response.json({ error: "Spotify client ID not configured" }, { status: 500 })
    }

    console.log("Refreshing token with client ID:", clientId)

    // Refresh token with Spotify
    const refreshResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token,
        client_id: clientId,
      }),
    })

    const responseText = await refreshResponse.text()
    console.log("Spotify refresh response:", { status: refreshResponse.status, body: responseText })

    if (!refreshResponse.ok) {
      console.error("Spotify token refresh failed:", responseText)
      return Response.json(
        {
          error: `Token refresh failed: ${refreshResponse.status} ${refreshResponse.statusText}`,
          details: responseText,
        },
        { status: refreshResponse.status },
      )
    }

    let tokenData
    try {
      tokenData = JSON.parse(responseText)
    } catch (parseError) {
      console.error("Failed to parse refresh response:", parseError)
      return Response.json({ error: "Invalid response from Spotify" }, { status: 500 })
    }

    return Response.json(tokenData)
  } catch (error) {
    console.error("Error in spotify-refresh route:", error)
    return Response.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
