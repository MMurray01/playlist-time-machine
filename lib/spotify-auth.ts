// Simple Spotify authentication that works around CSP issues

// Store these values in memory during the session
let spotifyToken: string | null = null
let spotifyTokenExpiry: number | null = null
let spotifyRefreshToken: string | null = null

// Constants
const SPOTIFY_CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || ""

// Generate a random string for state parameter
function generateRandomString(length: number): string {
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let text = ""

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length))
  }

  return text
}

// Get redirect URI based on current environment
function getRedirectUri(): string {
  if (typeof window === "undefined") return ""
  return `${window.location.origin}/api/spotify-callback`
}

// Initialize Spotify auth
export function initSpotifyAuth() {
  // Load tokens from localStorage if available
  if (typeof window !== "undefined") {
    try {
      spotifyToken = localStorage.getItem("spotify_token")
      const expiry = localStorage.getItem("spotify_expiry")
      spotifyTokenExpiry = expiry ? Number.parseInt(expiry, 10) : null
      spotifyRefreshToken = localStorage.getItem("spotify_refresh_token")

      console.log("Loaded Spotify auth state:", {
        hasToken: !!spotifyToken,
        expiry: spotifyTokenExpiry,
        hasRefreshToken: !!spotifyRefreshToken,
      })
    } catch (e) {
      console.error("Failed to load Spotify tokens from localStorage", e)
    }
  }
}

// Check if user is authenticated with Spotify
export function isSpotifyAuthenticated(): boolean {
  if (!spotifyToken || !spotifyTokenExpiry) {
    console.log("No token or expiry found")
    return false
  }

  const isValid = Date.now() < spotifyTokenExpiry
  console.log("Token validity check:", {
    now: Date.now(),
    expiry: spotifyTokenExpiry,
    isValid,
  })

  return isValid
}

// Start Spotify authentication flow
export function startSpotifyAuth() {
  if (!SPOTIFY_CLIENT_ID) {
    console.error("Spotify Client ID not configured")
    throw new Error("Spotify Client ID not configured")
  }

  console.log("Starting Spotify auth with client ID:", SPOTIFY_CLIENT_ID)

  const state = generateRandomString(16)
  const scope = "user-read-private user-read-email playlist-modify-private playlist-modify-public"
  const redirectUri = getRedirectUri()

  console.log("Auth parameters:", { state, scope, redirectUri })

  // Store state for verification
  if (typeof window !== "undefined") {
    localStorage.setItem("spotify_auth_state", state)
  }

  // Build authorization URL
  const authUrl = new URL("https://accounts.spotify.com/authorize")
  authUrl.searchParams.append("response_type", "code")
  authUrl.searchParams.append("client_id", SPOTIFY_CLIENT_ID)
  authUrl.searchParams.append("scope", scope)
  authUrl.searchParams.append("redirect_uri", redirectUri)
  authUrl.searchParams.append("state", state)

  console.log("Redirecting to auth URL:", authUrl.toString())

  // Direct redirect to Spotify (avoid our proxy for now)
  window.location.href = authUrl.toString()
}

// Handle Spotify authentication callback
export async function handleSpotifyCallback(code: string, state: string): Promise<boolean> {
  console.log("Handling Spotify callback:", { code: !!code, state: !!state })

  // Verify state
  const storedState = localStorage.getItem("spotify_auth_state")
  if (state !== storedState) {
    console.error("State mismatch:", { received: state, stored: storedState })
    return false
  }

  try {
    console.log("Exchanging code for token...")

    // Exchange code for token via our server endpoint to avoid CORS issues
    const response = await fetch("/api/spotify-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code }),
    })

    const responseText = await response.text()
    console.log("Token exchange response:", { status: response.status, body: responseText })

    if (!response.ok) {
      console.error("Token exchange failed:", responseText)
      return false
    }

    let data
    try {
      data = JSON.parse(responseText)
    } catch (parseError) {
      console.error("Failed to parse token response:", parseError)
      return false
    }

    // Save tokens
    spotifyToken = data.access_token
    spotifyRefreshToken = data.refresh_token
    spotifyTokenExpiry = Date.now() + data.expires_in * 1000

    console.log("Tokens received:", {
      hasAccessToken: !!spotifyToken,
      hasRefreshToken: !!spotifyRefreshToken,
      expiresIn: data.expires_in,
    })

    // Store in localStorage
    try {
      localStorage.setItem("spotify_token", spotifyToken)
      localStorage.setItem("spotify_expiry", spotifyTokenExpiry.toString())
      localStorage.setItem("spotify_refresh_token", spotifyRefreshToken || "")
      localStorage.removeItem("spotify_auth_state") // Clean up

      console.log("Tokens saved to localStorage")
    } catch (e) {
      console.error("Failed to save Spotify tokens to localStorage", e)
    }

    return true
  } catch (error) {
    console.error("Error handling Spotify callback", error)
    return false
  }
}

// Get Spotify access token (with auto-refresh if needed)
export async function getSpotifyToken(): Promise<string | null> {
  console.log("Getting Spotify token...")

  // Check if token needs refresh
  if (spotifyToken && spotifyTokenExpiry && Date.now() < spotifyTokenExpiry) {
    console.log("Using existing valid token")
    return spotifyToken
  }

  // Try to refresh token
  if (spotifyRefreshToken) {
    console.log("Attempting to refresh token...")

    try {
      const response = await fetch("/api/spotify-refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: spotifyRefreshToken }),
      })

      const responseText = await response.text()
      console.log("Token refresh response:", { status: response.status, body: responseText })

      if (!response.ok) {
        console.error("Token refresh failed:", responseText)
        clearSpotifyAuth()
        return null
      }

      let data
      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error("Failed to parse refresh response:", parseError)
        clearSpotifyAuth()
        return null
      }

      // Update tokens
      spotifyToken = data.access_token
      spotifyTokenExpiry = Date.now() + data.expires_in * 1000

      if (data.refresh_token) {
        spotifyRefreshToken = data.refresh_token
      }

      console.log("Token refreshed successfully")

      // Update localStorage
      try {
        localStorage.setItem("spotify_token", spotifyToken)
        localStorage.setItem("spotify_expiry", spotifyTokenExpiry.toString())
        if (data.refresh_token) {
          localStorage.setItem("spotify_refresh_token", spotifyRefreshToken || "")
        }
      } catch (e) {
        console.error("Failed to save refreshed Spotify tokens to localStorage", e)
      }

      return spotifyToken
    } catch (error) {
      console.error("Error refreshing Spotify token", error)
      clearSpotifyAuth()
      return null
    }
  }

  console.log("No valid token or refresh token available")
  return null
}

// Clear Spotify authentication
export function clearSpotifyAuth() {
  console.log("Clearing Spotify auth")

  spotifyToken = null
  spotifyTokenExpiry = null
  spotifyRefreshToken = null

  try {
    localStorage.removeItem("spotify_token")
    localStorage.removeItem("spotify_expiry")
    localStorage.removeItem("spotify_refresh_token")
    localStorage.removeItem("spotify_auth_state")
  } catch (e) {
    console.error("Failed to clear Spotify tokens from localStorage", e)
  }
}

// Initialize on module load
if (typeof window !== "undefined") {
  initSpotifyAuth()
}
