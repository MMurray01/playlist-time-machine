import type { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  try {
    console.log("=== Spotify Test Endpoint ===")

    const origin = request.nextUrl.origin
    const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || "20db563517e94795a0ab1ebd2bbb5607"

    // Test configuration
    const config = {
      client_id: clientId ? `${clientId.substring(0, 8)}...${clientId.substring(-4)}` : null,
      client_id_configured: !!clientId,
      environment: process.env.NODE_ENV || "development",
      origin: origin,
      redirect_uris: {
        api_callback: `${origin}/api/spotify/callback`,
        client_callback: `${origin}/callback`,
      },
      timestamp: new Date().toISOString(),
    }

    // Test endpoints
    const endpoints = [
      { name: "Auth Endpoint", path: "/api/spotify/auth", method: "GET" },
      { name: "Callback Endpoint", path: "/api/spotify/callback", method: "GET" },
      { name: "Status Endpoint", path: "/api/spotify/status", method: "GET" },
    ]

    const endpointTests = []

    for (const endpoint of endpoints) {
      try {
        const testUrl = `${origin}${endpoint.path}`
        const testResponse = await fetch(testUrl, {
          method: "HEAD", // Use HEAD to avoid triggering full responses
          headers: {
            "User-Agent": "Spotify-Test-Bot/1.0",
          },
        })

        endpointTests.push({
          name: endpoint.name,
          path: endpoint.path,
          status: testResponse.status,
          accessible: testResponse.status < 500,
        })
      } catch (testError) {
        endpointTests.push({
          name: endpoint.name,
          path: endpoint.path,
          status: "error",
          accessible: false,
          error: testError instanceof Error ? testError.message : "Unknown error",
        })
      }
    }

    // Spotify API connectivity test
    let spotifyApiTest = null
    try {
      const spotifyResponse = await fetch("https://accounts.spotify.com/api/token", {
        method: "HEAD",
      })
      spotifyApiTest = {
        accessible: true,
        status: spotifyResponse.status,
      }
    } catch (spotifyError) {
      spotifyApiTest = {
        accessible: false,
        error: spotifyError instanceof Error ? spotifyError.message : "Unknown error",
      }
    }

    const diagnostics = {
      status: "success",
      message: "Spotify integration test completed",
      configuration: config,
      endpoints: endpointTests,
      spotify_api: spotifyApiTest,
      recommendations: [],
    }

    // Add recommendations based on test results
    if (!config.client_id_configured) {
      diagnostics.recommendations.push("Configure NEXT_PUBLIC_SPOTIFY_CLIENT_ID environment variable")
    }

    const failedEndpoints = endpointTests.filter((test) => !test.accessible)
    if (failedEndpoints.length > 0) {
      diagnostics.recommendations.push(`Fix ${failedEndpoints.length} failing endpoint(s)`)
    }

    if (!spotifyApiTest?.accessible) {
      diagnostics.recommendations.push("Check internet connectivity to Spotify API")
    }

    return Response.json(diagnostics, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    })
  } catch (error) {
    console.error("Test endpoint error:", error)

    return Response.json(
      {
        status: "error",
        message: "Test endpoint failed",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
