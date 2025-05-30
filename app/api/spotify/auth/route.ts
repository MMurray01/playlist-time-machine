import type { NextRequest } from "next/server"

/**
 * Spotify OAuth Authorization Endpoint
 * Handles the initial redirect to Spotify's authorization server
 */
export async function GET(request: NextRequest) {
  try {
    console.log("=== Spotify Authorization Request ===")
    console.log("Request URL:", request.nextUrl.toString())
    console.log("Request method:", request.method)

    // Safely log headers
    const headers: Record<string, string> = {}
    request.headers.forEach((value, key) => {
      headers[key] = value
    })
    console.log("Headers:", headers)

    const searchParams = request.nextUrl.searchParams
    const codeChallenge = searchParams.get("code_challenge")
    const state = searchParams.get("state")
    const userAgent = request.headers.get("user-agent") || ""
    const accept = request.headers.get("accept") || ""

    console.log("Query parameters:", {
      codeChallenge: codeChallenge ? `present (${codeChallenge.length} chars)` : "missing",
      state: state ? `present (${state.length} chars)` : "missing",
      userAgent: userAgent.substring(0, 50) + "...",
      accept: accept.substring(0, 50) + "...",
    })

    // Check if this is a direct browser access
    const isDirectAccess = accept.includes("text/html") && !codeChallenge && !state

    if (isDirectAccess) {
      console.log("Direct browser access detected - returning helpful HTML response")

      const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || "20db563517e94795a0ab1ebd2bbb5607"
      const origin = request.nextUrl.origin

      const htmlResponse = `<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Spotify Auth Endpoint - Debug</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      body { 
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
        line-height: 1.6; 
        padding: 2rem; 
        max-width: 900px; 
        margin: 0 auto; 
        background: #f8fafc;
      }
      .container { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
      .header { color: #1e293b; margin-bottom: 2rem; }
      .card { 
        border: 1px solid #e2e8f0; 
        border-radius: 6px; 
        padding: 1.5rem; 
        margin-bottom: 1.5rem; 
      }
      .info { background-color: #eff6ff; border-color: #3b82f6; }
      .warning { background-color: #fef3c7; border-color: #f59e0b; }
      .success { background-color: #f0fdf4; border-color: #10b981; }
      .error { background-color: #fef2f2; border-color: #ef4444; }
      code { 
        background: #f1f5f9; 
        padding: 0.25rem 0.5rem; 
        border-radius: 4px; 
        font-family: 'Monaco', 'Menlo', monospace;
        font-size: 0.875rem;
      }
      pre { 
        background: #f8fafc; 
        padding: 1rem; 
        border-radius: 6px; 
        overflow-x: auto; 
        border: 1px solid #e2e8f0;
      }
      .btn {
        display: inline-block;
        padding: 0.5rem 1rem;
        background: #3b82f6;
        color: white;
        text-decoration: none;
        border-radius: 6px;
        margin-right: 0.5rem;
        margin-bottom: 0.5rem;
      }
      .btn:hover { background: #2563eb; }
      .btn-outline {
        background: transparent;
        color: #3b82f6;
        border: 1px solid #3b82f6;
      }
      .btn-outline:hover { background: #3b82f6; color: white; }
      .status-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem; }
      @media (max-width: 768px) { .status-grid { grid-template-columns: 1fr; } }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>🎵 Spotify Authentication Endpoint</h1>
        <p>Debug information for <code>/api/spotify/auth</code></p>
      </div>

      <div class="card info">
        <h2>ℹ️ This is an API endpoint</h2>
        <p>This URL is part of the Spotify OAuth flow and should not be accessed directly in a browser.</p>
        <p>To use the Spotify integration, return to the main application and use the "Connect to Spotify" button.</p>
      </div>

      <div class="card">
        <h3>🔧 Current Configuration</h3>
        <div class="status-grid">
          <div>
            <strong>Client ID:</strong><br>
            <code>${clientId ? `${clientId.substring(0, 8)}...${clientId.substring(-4)}` : "Not configured"}</code>
          </div>
          <div>
            <strong>Environment:</strong><br>
            <code>${process.env.NODE_ENV || "development"}</code>
          </div>
          <div>
            <strong>Origin:</strong><br>
            <code>${origin}</code>
          </div>
          <div>
            <strong>Status:</strong><br>
            <code class="${clientId ? "success" : "error"}">${clientId ? "Configured" : "Missing Client ID"}</code>
          </div>
        </div>
      </div>

      <div class="card">
        <h3>🔗 Required Redirect URIs</h3>
        <p>Make sure these exact URIs are added to your <strong>Spotify Developer Dashboard</strong>:</p>
        <pre>${origin}/api/spotify/callback
${origin}/callback</pre>
        <p><small>⚠️ URIs must match exactly (including https/http and trailing slashes)</small></p>
      </div>

      <div class="card">
        <h3>🛠️ Debug Tools</h3>
        <p>Use these tools to test and debug your Spotify integration:</p>
        <div>
          <a href="/" class="btn">🏠 Main App</a>
          <a href="/spotify-debug" class="btn btn-outline">🔍 Debug Page</a>
          <a href="/api/spotify/test" class="btn btn-outline">🧪 API Test</a>
          <a href="/api/spotify/status" class="btn btn-outline">📊 Status Check</a>
        </div>
      </div>

      <div class="card">
        <h3>📋 OAuth Flow Steps</h3>
        <ol>
          <li>User clicks "Connect to Spotify" button</li>
          <li>App generates PKCE code verifier and challenge</li>
          <li>App calls <code>/api/spotify/auth</code> with code_challenge and state</li>
          <li>Server redirects to Spotify authorization page</li>
          <li>User approves permissions on Spotify</li>
          <li>Spotify redirects to <code>/api/spotify/callback</code></li>
          <li>Server exchanges code for tokens</li>
          <li>User is redirected back to app</li>
        </ol>
      </div>

      <div class="card warning">
        <h3>⚠️ Expected Parameters</h3>
        <p>This endpoint expects these parameters:</p>
        <ul>
          <li><code>code_challenge</code> - PKCE code challenge (43-128 characters)</li>
          <li><code>state</code> - Random state parameter (8+ characters)</li>
        </ul>
        <p>These are automatically provided by the OAuth flow - don't access this URL directly.</p>
      </div>

      <div class="card">
        <h3>📚 Documentation</h3>
        <p>For more information, see:</p>
        <ul>
          <li><a href="https://developer.spotify.com/documentation/web-api/tutorials/code-flow" target="_blank">Spotify OAuth Documentation</a></li>
          <li><a href="https://developer.spotify.com/documentation/web-api/howtos/web-app-profile" target="_blank">Web App Profile Guide</a></li>
        </ul>
      </div>
    </div>
  </body>
</html>`

      return new Response(htmlResponse, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      })
    }

    // Check environment configuration
    const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || "20db563517e94795a0ab1ebd2bbb5607"

    console.log("Environment check:", {
      hasClientId: !!clientId,
      clientIdLength: clientId ? clientId.length : 0,
      nodeEnv: process.env.NODE_ENV,
    })

    if (!clientId) {
      console.error("NEXT_PUBLIC_SPOTIFY_CLIENT_ID not configured")
      return Response.json(
        {
          error: "server_configuration_error",
          error_description: "Spotify Client ID is not configured on the server",
          details: "The NEXT_PUBLIC_SPOTIFY_CLIENT_ID environment variable is missing",
          help: "Please set the NEXT_PUBLIC_SPOTIFY_CLIENT_ID environment variable and restart the server",
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      )
    }

    // Handle missing parameters
    if (!codeChallenge || !state) {
      console.log("Missing required parameters")

      const missingParams = []
      if (!codeChallenge) missingParams.push("code_challenge")
      if (!state) missingParams.push("state")

      return Response.json(
        {
          error: "missing_required_parameters",
          error_description: `Missing required parameters: ${missingParams.join(", ")}`,
          details: "This endpoint should not be accessed directly. Use the Spotify authentication flow instead.",
          missing_parameters: missingParams,
          help: {
            message: "To authenticate with Spotify, use the 'Connect to Spotify' button in the app",
            proper_usage: "This endpoint is called automatically during the OAuth flow",
            debug_endpoint: "/api/spotify/test",
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      )
    }

    // Validate parameter formats
    if (codeChallenge.length < 43 || codeChallenge.length > 128) {
      console.error("Invalid code_challenge length:", codeChallenge.length)
      return Response.json(
        {
          error: "invalid_code_challenge",
          error_description: "Code challenge must be between 43 and 128 characters",
          details: `Received code challenge with ${codeChallenge.length} characters`,
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      )
    }

    if (state.length < 8) {
      console.error("Invalid state length:", state.length)
      return Response.json(
        {
          error: "invalid_state",
          error_description: "State parameter must be at least 8 characters",
          details: `Received state with ${state.length} characters`,
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      )
    }

    // Build redirect URI
    const origin = request.nextUrl.origin
    const redirectUri = `${origin}/api/spotify/callback`

    console.log("Building authorization URL:", {
      clientId: `${clientId.substring(0, 8)}...`,
      redirectUri,
      origin,
    })

    // Build Spotify authorization URL
    const authUrl = new URL("https://accounts.spotify.com/authorize")

    const authParams = {
      response_type: "code",
      client_id: clientId,
      scope: [
        "user-read-private",
        "user-read-email",
        "playlist-modify-public",
        "playlist-modify-private",
        "streaming",
        "user-read-playback-state",
        "user-modify-playback-state",
      ].join(" "),
      redirect_uri: redirectUri,
      code_challenge_method: "S256",
      code_challenge: codeChallenge,
      state: state,
      show_dialog: "false",
    }

    // Add parameters to URL
    for (const [key, value] of Object.entries(authParams)) {
      authUrl.searchParams.append(key, value)
    }

    const finalAuthUrl = authUrl.toString()
    console.log("Redirecting to Spotify:", {
      url: `${finalAuthUrl.substring(0, 100)}...`,
      paramCount: authUrl.searchParams.size,
    })

    // Return redirect response
    return Response.redirect(finalAuthUrl, 302)
  } catch (error) {
    console.error("Unexpected error in authorization endpoint:", error)

    // Safely extract error information
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
    const errorStack = error instanceof Error ? error.stack : undefined

    console.error("Error details:", {
      message: errorMessage,
      stack: errorStack,
      type: typeof error,
      constructor: error?.constructor?.name,
    })

    // Return detailed error information
    return Response.json(
      {
        error: "internal_server_error",
        error_description: "An unexpected error occurred while processing the authorization request",
        details: errorMessage,
        stack: process.env.NODE_ENV === "development" ? errorStack : undefined,
        timestamp: new Date().toISOString(),
        help: "Check the server logs for more details",
        request_url: request.nextUrl.toString(),
      },
      { status: 500 },
    )
  }
}

/**
 * Handle other HTTP methods with proper error responses
 */
export async function POST() {
  return Response.json(
    {
      error: "method_not_allowed",
      error_description: "This endpoint only accepts GET requests",
      allowed_methods: ["GET"],
      help: "Use GET request with code_challenge and state parameters",
    },
    {
      status: 405,
      headers: { Allow: "GET" },
    },
  )
}

export async function PUT() {
  return POST()
}

export async function DELETE() {
  return POST()
}

export async function PATCH() {
  return POST()
}

export async function HEAD() {
  return new Response(null, {
    status: 200,
    headers: { Allow: "GET" },
  })
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      Allow: "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })
}
