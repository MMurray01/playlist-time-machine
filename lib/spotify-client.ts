/**
 * Spotify Client Service - Fixed for Preview Functionality
 * Handles all Spotify interactions with improved audio support
 */

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

class SpotifyClient {
  private tokens: SpotifyTokens | null = null
  private readonly STORAGE_KEY = "spotify_tokens_v7"
  private authListeners: Set<() => void> = new Set()

  constructor() {
    if (typeof window !== "undefined") {
      this.loadTokensFromStorage()
      this.setupMessageListener()
    }
  }

  /**
   * Setup message listener for OAuth callback
   */
  private setupMessageListener(): void {
    window.addEventListener("message", (event) => {
      if (event.data.type === "spotify-auth-success") {
        console.log("Received auth success message")
        this.handleCallback(event.data.code, event.data.state)
      }
    })

    // Check for URL parameters on page load (fallback)
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get("spotify") === "connected") {
      // Trigger a re-check of auth status
      setTimeout(() => this.notifyAuthListeners(), 1000)
    }
  }

  /**
   * Add auth state listener
   */
  public addAuthListener(callback: () => void): void {
    this.authListeners.add(callback)
  }

  /**
   * Remove auth state listener
   */
  public removeAuthListener(callback: () => void): void {
    this.authListeners.delete(callback)
  }

  /**
   * Notify all auth listeners
   */
  private notifyAuthListeners(): void {
    this.authListeners.forEach((callback) => callback())
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
      console.warn("crypto.subtle not available, using plain text challenge")
      return codeVerifier
    }

    try {
      const encoder = new TextEncoder()
      const data = encoder.encode(codeVerifier)
      const digest = await window.crypto.subtle.digest("SHA-256", data)

      return btoa(String.fromCharCode(...new Uint8Array(digest)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "")
    } catch (error) {
      console.warn("Failed to generate code challenge, using plain text:", error)
      return codeVerifier
    }
  }

  /**
   * Load tokens from localStorage
   */
  private loadTokensFromStorage(): void {
    if (typeof window === "undefined") return

    try {
      const storedTokens = localStorage.getItem(this.STORAGE_KEY)
      if (storedTokens) {
        this.tokens = JSON.parse(storedTokens)
        console.log("Loaded Spotify tokens from storage", {
          hasAccessToken: !!this.tokens?.accessToken,
          hasRefreshToken: !!this.tokens?.refreshToken,
          expiresAt: this.tokens?.expiresAt,
          isExpired: this.tokens ? Date.now() > this.tokens.expiresAt : true,
        })

        // Notify listeners that auth state may have changed
        this.notifyAuthListeners()
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
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.tokens))
      console.log("Saved Spotify tokens to storage")
      this.notifyAuthListeners()
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
        localStorage.removeItem(this.STORAGE_KEY)
        localStorage.removeItem("spotify_code_verifier")
        localStorage.removeItem("spotify_auth_state")
        console.log("Cleared Spotify tokens from storage")
        this.notifyAuthListeners()
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

    if (isExpired) {
      console.log("Token expired, clearing tokens")
      this.clearTokens()
      return false
    }

    return true
  }

  /**
   * Start OAuth authorization flow
   */
  public async startAuthFlow(): Promise<void> {
    const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || "20db563517e94795a0ab1ebd2bbb5607"
    if (!clientId) {
      throw new Error("Spotify Client ID not configured")
    }

    console.log("Starting Spotify OAuth flow")

    try {
      // Generate PKCE parameters
      const codeVerifier = this.generateRandomString(128)
      const codeChallenge = await this.generateCodeChallenge(codeVerifier)
      const state = this.generateRandomString(16)

      console.log("Generated PKCE parameters:", {
        codeVerifierLength: codeVerifier.length,
        codeChallengeLength: codeChallenge.length,
        stateLength: state.length,
      })

      // Store for later verification
      if (typeof window !== "undefined") {
        localStorage.setItem("spotify_code_verifier", codeVerifier)
        localStorage.setItem("spotify_auth_state", state)
        // Store current URL to return to after auth
        localStorage.setItem("spotify_auth_return_url", window.location.href)
      }

      // Build the authorization URL
      const redirectUri = `${window.location.origin}/api/spotify/callback`
      const authUrl = new URL("https://accounts.spotify.com/authorize")

      authUrl.searchParams.append("response_type", "code")
      authUrl.searchParams.append("client_id", clientId)
      authUrl.searchParams.append(
        "scope",
        [
          "user-read-private",
          "user-read-email",
          "playlist-modify-public",
          "playlist-modify-private",
          "streaming",
          "user-read-playback-state",
          "user-modify-playback-state",
        ].join(" "),
      )
      authUrl.searchParams.append("redirect_uri", redirectUri)
      authUrl.searchParams.append("code_challenge_method", "S256")
      authUrl.searchParams.append("code_challenge", codeChallenge)
      authUrl.searchParams.append("state", state)

      const finalUrl = authUrl.toString()
      console.log("Redirecting to Spotify authorization")

      // For mobile, always use redirect instead of popup
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

      if (isMobile) {
        window.location.href = finalUrl
      } else {
        // Open in popup for desktop
        const popup = window.open(finalUrl, "spotify-auth", "width=500,height=600,scrollbars=yes,resizable=yes")

        if (!popup) {
          // Fallback to redirect if popup blocked
          window.location.href = finalUrl
        }
      }
    } catch (error) {
      console.error("Failed to start auth flow:", error)
      this.clearTokens()
      throw new Error(
        `Failed to initiate Spotify authentication: ${error instanceof Error ? error.message : "Unknown error"}`,
      )
    }
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

      // Exchange code for tokens via our server-side endpoint
      const response = await fetch("/api/spotify/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code,
          codeVerifier,
          redirectUri: `${window.location.origin}/api/spotify/callback`,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("Token exchange failed:", errorData)
        throw new Error(errorData.error_description || errorData.error || `HTTP ${response.status}`)
      }

      const tokenData = await response.json()
      console.log("Received tokens from server:", {
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
          throw new Error(`Token refresh failed: ${response.status}`)
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
   * Get current user profile
   */
  public async getCurrentUser(): Promise<SpotifyUser> {
    const token = await this.getValidToken()

    const response = await fetch("https://api.spotify.com/v1/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to get user profile: ${response.status}`)
    }

    return response.json()
  }

  /**
   * Search for tracks
   */
  public async searchTracks(query: string, limit = 10): Promise<SpotifyTrack[]> {
    const token = await this.getValidToken()

    const searchParams = new URLSearchParams({
      q: query,
      type: "track",
      limit: limit.toString(),
      market: "US",
    })

    console.log(`Spotify API search: ${query}`)

    const response = await fetch(`https://api.spotify.com/v1/search?${searchParams.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Search failed: ${response.status}`)
    }

    const data = await response.json()
    const tracks = data.tracks?.items || []

    console.log(`Found ${tracks.length} tracks for query: "${query}"`)

    // Log preview URLs for debugging
    tracks.forEach((track: SpotifyTrack, index: number) => {
      console.log(
        `${index + 1}. "${track.name}" by ${track.artists.map((a) => a.name).join(", ")} - Preview: ${track.preview_url ? "Available" : "Not available"}`,
      )
    })

    return tracks
  }

  /**
   * Create a new playlist and add tracks
   */
  public async createPlaylist(
    userId: string,
    name: string,
    description?: string,
    trackUris?: string[],
  ): Promise<SpotifyPlaylist> {
    const token = await this.getValidToken()

    // Create playlist
    const createResponse = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        description: description || "",
        public: false,
      }),
    })

    if (!createResponse.ok) {
      const errorData = await createResponse.json().catch(() => ({}))
      throw new Error(errorData.error?.message || `Failed to create playlist: ${createResponse.status}`)
    }

    const playlist = await createResponse.json()

    // Add tracks if provided
    if (trackUris && trackUris.length > 0) {
      const batchSize = 100
      for (let i = 0; i < trackUris.length; i += batchSize) {
        const batch = trackUris.slice(i, i + batchSize)

        const addResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            uris: batch,
          }),
        })

        if (!addResponse.ok) {
          console.warn(`Failed to add batch ${Math.floor(i / batchSize) + 1}: ${addResponse.status}`)
        }

        // Rate limiting
        await new Promise((resolve) => setTimeout(resolve, 200))
      }
    }

    return playlist
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
export const spotifyClient = new SpotifyClient()
export type { SpotifyUser, SpotifyTrack, SpotifyPlaylist }
