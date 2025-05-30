/**
 * Spotify Web API Service
 * Implements OAuth 2.0 Authorization Code Flow with PKCE
 * Based on Spotify Web API Documentation: https://developer.spotify.com/documentation/web-api/
 */

interface SpotifyConfig {
  clientId: string
  redirectUri: string
  scopes: string[]
}

interface SpotifyTokens {
  accessToken: string
  refreshToken?: string
  expiresAt: number
}

interface SpotifyUser {
  id: string
  display_name: string
  email: string
  images: Array<{ url: string }>
}

interface SpotifyTrack {
  id: string
  name: string
  artists: Array<{ name: string }>
  preview_url: string | null
  external_urls: { spotify: string }
  uri: string
  album: {
    name: string
    images: Array<{ url: string; height: number; width: number }>
  }
}

interface SpotifyPlaylist {
  id: string
  name: string
  external_urls: { spotify: string }
  tracks: { total: number }
}

class SpotifyService {
  private config: SpotifyConfig
  private tokens: SpotifyTokens | null = null
  private codeVerifier: string | null = null

  constructor() {
    this.config = {
      clientId: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || "",
      redirectUri: typeof window !== "undefined" ? `${window.location.origin}/callback` : "",
      scopes: [
        "user-read-private",
        "user-read-email",
        "playlist-modify-public",
        "playlist-modify-private",
        "streaming",
        "user-read-playback-state",
        "user-modify-playback-state",
      ],
    }

    this.loadTokensFromStorage()
  }

  /**
   * Generate cryptographically secure random string for PKCE
   */
  private generateRandomString(length: number): string {
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~"

    if (typeof window !== "undefined" && window.crypto && window.crypto.getRandomValues) {
      const array = new Uint8Array(length)
      window.crypto.getRandomValues(array)
      return Array.from(array, (byte) => possible[byte % possible.length]).join("")
    }

    // Fallback for environments without crypto.getRandomValues
    let result = ""
    for (let i = 0; i < length; i++) {
      result += possible.charAt(Math.floor(Math.random() * possible.length))
    }
    return result
  }

  /**
   * Generate PKCE code challenge from verifier
   */
  private async generateCodeChallenge(codeVerifier: string): Promise<string> {
    if (typeof window === "undefined" || !window.crypto || !window.crypto.subtle) {
      // Fallback: return the verifier as-is (not recommended for production)
      console.warn("crypto.subtle not available, using plain text challenge")
      return codeVerifier
    }

    const encoder = new TextEncoder()
    const data = encoder.encode(codeVerifier)
    const digest = await window.crypto.subtle.digest("SHA-256", data)

    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "")
  }

  /**
   * Load tokens from localStorage
   */
  private loadTokensFromStorage(): void {
    if (typeof window === "undefined") return

    try {
      const storedTokens = localStorage.getItem("spotify_tokens")
      if (storedTokens) {
        this.tokens = JSON.parse(storedTokens)
        console.log("Loaded Spotify tokens from storage", {
          hasAccessToken: !!this.tokens?.accessToken,
          hasRefreshToken: !!this.tokens?.refreshToken,
          expiresAt: this.tokens?.expiresAt,
          isExpired: this.tokens ? Date.now() > this.tokens.expiresAt : true,
        })
      }
    } catch (error) {
      console.error("Failed to load Spotify tokens from storage:", error)
      this.clearTokens()
    }
  }

  /**
   * Save tokens to localStorage
   */
  private saveTokensToStorage(): void {
    if (typeof window === "undefined" || !this.tokens) return

    try {
      localStorage.setItem("spotify_tokens", JSON.stringify(this.tokens))
      console.log("Saved Spotify tokens to storage")
    } catch (error) {
      console.error("Failed to save Spotify tokens to storage:", error)
    }
  }

  /**
   * Clear all stored tokens
   */
  private clearTokens(): void {
    this.tokens = null

    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("spotify_tokens")
        localStorage.removeItem("spotify_code_verifier")
        localStorage.removeItem("spotify_auth_state")
        console.log("Cleared Spotify tokens from storage")
      } catch (error) {
        console.error("Failed to clear Spotify tokens from storage:", error)
      }
    }
  }

  /**
   * Check if user is authenticated and token is valid
   */
  public isAuthenticated(): boolean {
    if (!this.tokens || !this.tokens.accessToken) {
      return false
    }

    // Check if token is expired (with 5 minute buffer)
    const isExpired = Date.now() > this.tokens.expiresAt - 5 * 60 * 1000

    console.log("Authentication check:", {
      hasToken: !!this.tokens.accessToken,
      expiresAt: new Date(this.tokens.expiresAt).toISOString(),
      isExpired,
      timeUntilExpiry: Math.round((this.tokens.expiresAt - Date.now()) / 1000 / 60) + " minutes",
    })

    return !isExpired
  }

  /**
   * Start OAuth authorization flow
   */
  public async startAuthFlow(): Promise<void> {
    if (!this.config.clientId) {
      throw new Error(
        "Spotify Client ID not configured. Please set NEXT_PUBLIC_SPOTIFY_CLIENT_ID environment variable.",
      )
    }

    console.log("Starting Spotify OAuth flow with config:", {
      clientId: this.config.clientId,
      redirectUri: this.config.redirectUri,
      scopes: this.config.scopes,
    })

    // Generate PKCE parameters
    this.codeVerifier = this.generateRandomString(128)
    const codeChallenge = await this.generateCodeChallenge(this.codeVerifier)
    const state = this.generateRandomString(16)

    // Store for later verification
    if (typeof window !== "undefined") {
      localStorage.setItem("spotify_code_verifier", this.codeVerifier)
      localStorage.setItem("spotify_auth_state", state)
    }

    // Build authorization URL
    const authUrl = new URL("https://accounts.spotify.com/authorize")
    const params = {
      response_type: "code",
      client_id: this.config.clientId,
      scope: this.config.scopes.join(" "),
      redirect_uri: this.config.redirectUri,
      code_challenge_method: "S256",
      code_challenge: codeChallenge,
      state: state,
      show_dialog: "false", // Set to true for testing with multiple accounts
    }

    Object.entries(params).forEach(([key, value]) => {
      authUrl.searchParams.append(key, value)
    })

    console.log("Redirecting to Spotify authorization:", authUrl.toString())

    // Redirect to Spotify
    window.location.href = authUrl.toString()
  }

  /**
   * Handle OAuth callback and exchange code for tokens
   */
  public async handleCallback(code: string, state: string): Promise<boolean> {
    console.log("Handling Spotify OAuth callback")

    try {
      // Verify state parameter
      const storedState = localStorage.getItem("spotify_auth_state")
      if (state !== storedState) {
        console.error("State parameter mismatch:", { received: state, stored: storedState })
        throw new Error("Invalid state parameter - possible CSRF attack")
      }

      // Get stored code verifier
      const codeVerifier = localStorage.getItem("spotify_code_verifier")
      if (!codeVerifier) {
        console.error("Code verifier not found in storage")
        throw new Error("Code verifier not found")
      }

      console.log("Exchanging authorization code for tokens")

      // Exchange code for tokens via our API route
      const response = await fetch("/api/spotify/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code,
          codeVerifier,
          redirectUri: this.config.redirectUri,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("Token exchange failed:", errorData)
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const tokenData = await response.json()
      console.log("Received tokens from Spotify:", {
        hasAccessToken: !!tokenData.access_token,
        hasRefreshToken: !!tokenData.refresh_token,
        expiresIn: tokenData.expires_in,
      })

      // Store tokens
      this.tokens = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: Date.now() + tokenData.expires_in * 1000,
      }

      this.saveTokensToStorage()

      // Clean up temporary storage
      localStorage.removeItem("spotify_code_verifier")
      localStorage.removeItem("spotify_auth_state")

      return true
    } catch (error) {
      console.error("Error handling OAuth callback:", error)
      this.clearTokens()
      return false
    }
  }

  /**
   * Get valid access token (refresh if necessary)
   */
  private async getValidToken(): Promise<string> {
    if (!this.tokens) {
      throw new Error("Not authenticated with Spotify")
    }

    // If token is still valid, return it
    if (Date.now() < this.tokens.expiresAt - 5 * 60 * 1000) {
      return this.tokens.accessToken
    }

    // Try to refresh token
    if (this.tokens.refreshToken) {
      console.log("Refreshing Spotify access token")

      try {
        const response = await fetch("/api/spotify/refresh", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            refreshToken: this.tokens.refreshToken,
          }),
        })

        if (!response.ok) {
          throw new Error(`Token refresh failed: ${response.status} ${response.statusText}`)
        }

        const tokenData = await response.json()

        // Update tokens
        this.tokens.accessToken = tokenData.access_token
        this.tokens.expiresAt = Date.now() + tokenData.expires_in * 1000

        if (tokenData.refresh_token) {
          this.tokens.refreshToken = tokenData.refresh_token
        }

        this.saveTokensToStorage()
        console.log("Successfully refreshed Spotify token")

        return this.tokens.accessToken
      } catch (error) {
        console.error("Failed to refresh token:", error)
        this.clearTokens()
        throw new Error("Authentication expired. Please log in again.")
      }
    }

    throw new Error("No refresh token available. Please log in again.")
  }

  /**
   * Make authenticated API request to Spotify
   */
  private async makeApiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await this.getValidToken()

    const response = await fetch(`https://api.spotify.com/v1${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    })

    if (response.status === 429) {
      // Rate limited - get retry after header
      const retryAfter = response.headers.get("Retry-After")
      const waitTime = retryAfter ? Number.parseInt(retryAfter) * 1000 : 1000

      console.log(`Rate limited by Spotify API. Waiting ${waitTime}ms before retry...`)
      await new Promise((resolve) => setTimeout(resolve, waitTime))

      // Retry the request
      return this.makeApiRequest<T>(endpoint, options)
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error(`Spotify API error:`, {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
      })

      throw new Error(errorData.error?.message || `Spotify API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Get current user profile
   */
  public async getCurrentUser(): Promise<SpotifyUser> {
    console.log("Fetching current user profile")
    return this.makeApiRequest<SpotifyUser>("/me")
  }

  /**
   * Search for tracks
   */
  public async searchTracks(query: string, limit = 10): Promise<SpotifyTrack[]> {
    console.log(`Searching for tracks: "${query}"`)

    const encodedQuery = encodeURIComponent(query)
    const response = await this.makeApiRequest<{ tracks: { items: SpotifyTrack[] } }>(
      `/search?q=${encodedQuery}&type=track&limit=${limit}&market=US`,
    )

    console.log(`Found ${response.tracks.items.length} tracks for query: "${query}"`)
    return response.tracks.items
  }

  /**
   * Create a new playlist
   */
  public async createPlaylist(userId: string, name: string, description?: string): Promise<SpotifyPlaylist> {
    console.log(`Creating playlist: "${name}" for user: ${userId}`)

    return this.makeApiRequest<SpotifyPlaylist>(`/users/${userId}/playlists`, {
      method: "POST",
      body: JSON.stringify({
        name,
        description: description || "",
        public: false,
      }),
    })
  }

  /**
   * Add tracks to playlist
   */
  public async addTracksToPlaylist(playlistId: string, trackUris: string[]): Promise<void> {
    console.log(`Adding ${trackUris.length} tracks to playlist: ${playlistId}`)

    // Spotify API allows max 100 tracks per request
    const chunks = []
    for (let i = 0; i < trackUris.length; i += 100) {
      chunks.push(trackUris.slice(i, i + 100))
    }

    for (const [index, chunk] of chunks.entries()) {
      console.log(`Adding chunk ${index + 1}/${chunks.length} (${chunk.length} tracks)`)

      await this.makeApiRequest(`/playlists/${playlistId}/tracks`, {
        method: "POST",
        body: JSON.stringify({
          uris: chunk,
        }),
      })

      // Add small delay between chunks to avoid rate limiting
      if (index < chunks.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }
  }

  /**
   * Logout user
   */
  public logout(): void {
    console.log("Logging out of Spotify")
    this.clearTokens()
  }
}

// Export singleton instance
export const spotifyService = new SpotifyService()
export type { SpotifyUser, SpotifyTrack, SpotifyPlaylist }
