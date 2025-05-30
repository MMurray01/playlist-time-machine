import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  console.log("=== Token Refresh Endpoint ===")

  try {
    const body = await request.json()
    const { refreshToken } = body

    console.log("Token refresh request:", {
      hasRefreshToken: !!refreshToken,
    })

    if (!refreshToken) {
      return NextResponse.json(
        { error: "missing_parameters", error_description: "Missing refresh token" },
        { status: 400 },
      )
    }

    const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || "20db563517e94795a0ab1ebd2bbb5607"
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET

    if (!clientSecret) {
      console.error("Spotify client secret not configured")
      return NextResponse.json(
        { error: "server_error", error_description: "Server configuration error" },
        { status: 500 },
      )
    }

    // Refresh the token
    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    })

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok) {
      console.error("Spotify token refresh failed:", tokenData)
      return NextResponse.json(
        {
          error: tokenData.error || "token_refresh_failed",
          error_description: tokenData.error_description || "Failed to refresh token",
        },
        { status: tokenResponse.status },
      )
    }

    console.log("Token refresh successful:", {
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token,
      expiresIn: tokenData.expires_in,
    })

    return NextResponse.json(tokenData)
  } catch (error) {
    console.error("Error in token refresh:", error)
    return NextResponse.json({ error: "server_error", error_description: "Internal server error" }, { status: 500 })
  }
}
