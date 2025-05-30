import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  console.log("=== Token Exchange Endpoint ===")

  try {
    const body = await request.json()
    const { code, codeVerifier, redirectUri } = body

    console.log("Token exchange request:", {
      hasCode: !!code,
      hasCodeVerifier: !!codeVerifier,
      redirectUri,
    })

    if (!code || !codeVerifier || !redirectUri) {
      return NextResponse.json(
        { error: "missing_parameters", error_description: "Missing required parameters" },
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

    // Exchange code for tokens
    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }),
    })

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok) {
      console.error("Spotify token exchange failed:", tokenData)
      return NextResponse.json(
        {
          error: tokenData.error || "token_exchange_failed",
          error_description: tokenData.error_description || "Failed to exchange code for tokens",
        },
        { status: tokenResponse.status },
      )
    }

    console.log("Token exchange successful:", {
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token,
      expiresIn: tokenData.expires_in,
    })

    return NextResponse.json(tokenData)
  } catch (error) {
    console.error("Error in token exchange:", error)
    return NextResponse.json({ error: "server_error", error_description: "Internal server error" }, { status: 500 })
  }
}
