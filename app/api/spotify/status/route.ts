import type { NextRequest } from "next/server"

/**
 * Spotify Integration Status Endpoint
 * Provides a simple status check for the Spotify integration
 */
export async function GET(request: NextRequest) {
  try {
    const origin = request.nextUrl.origin
    const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID

    // Test the auth endpoint
    let authEndpointStatus = "unknown"
    try {
      const authTestUrl = `${origin}/api/spotify/auth`
      const authResponse = await fetch(authTestUrl)
      authEndpointStatus = authResponse.status === 400 ? "working" : `unexpected_status_${authResponse.status}`
    } catch (authError) {
      authEndpointStatus = "error"
    }

    const status = {
      service: "Spotify Integration",
      status: clientId ? "configured" : "not_configured",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      configuration: {
        client_id: clientId ? "✓ Set" : "✗ Missing",
        client_id_length: clientId ? clientId.length : 0,
        origin: origin,
      },
      endpoints: {
        auth: `${origin}/api/spotify/auth`,
        callback: `${origin}/api/spotify/callback`,
        token: `${origin}/api/spotify/token`,
        test: `${origin}/api/spotify/test`,
        status: `${origin}/api/spotify/status`,
      },
      auth_endpoint_test: authEndpointStatus,
      health_check: "ok",
    }

    return Response.json(status, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    })
  } catch (error) {
    console.error("Error in status endpoint:", error)

    return Response.json(
      {
        service: "Spotify Integration",
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
        health_check: "failed",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      },
    )
  }
}
