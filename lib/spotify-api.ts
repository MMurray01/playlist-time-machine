import { SPOTIFY_CONFIG, getRedirectUri } from "./spotify-config"

export interface SpotifyTrack {
  id: string
  name: string
  artists: { name: string }[]
  preview_url: string | null
  external_urls: { spotify: string }
  duration_ms: number
  album: {
    name: string
    images: { url: string; height: number; width: number }[]
  }
  uri: string
}

export interface SpotifyUser {
  id: string
  display_name: string
  email: string
  images: { url: string }[]
}

export interface SpotifyPlaylist {
  id: string
  name: string
  external_urls: { spotify: string }
  tracks: { total: number }
}

export interface SpotifyError {
  error: {
    status: number
    message: string
  }
}

class SpotifyAPIClient {
  private accessToken: string | null = null
  private refreshToken: string | null = null
  private tokenExpiry: number | null = null

  constructor() {
    if (typeof window !== "undefined") {
      this.loadTokensFromStorage()
    }
  }

  private loadTokensFromStorage(): void {
    this.accessToken = localStorage.getItem("spotify_access_token")
    this.refreshToken = localStorage.getItem("spotify_refresh_token")
    const expiry = localStorage.getItem("spotify_token_expiry")
    this.tokenExpiry = expiry ? Number.parseInt(expiry) : null
  }

  private saveTokensToStorage(accessToken: string, refreshToken?: string, expiresIn?: number): void {
    this.accessToken = accessToken
    localStorage.setItem("spotify_access_token", accessToken)

    if (refreshToken) {
      this.refreshToken = refreshToken
      localStorage.setItem("spotify_refresh_token", refreshToken)
    }

    if (expiresIn) {
      const expiry = Date.now() + expiresIn * 1000
      this.tokenExpiry = expiry
      localStorage.setItem("spotify_token_expiry", expiry.toString())
    }
  }

  private clearTokensFromStorage(): void {
    this.accessToken = null
    this.refreshToken = null
    this.tokenExpiry = null
    localStorage.removeItem("spotify_access_token")
    localStorage.removeItem("spotify_refresh_token")
    localStorage.removeItem("spotify_token_expiry")
    localStorage.removeItem("code_verifier")
  }

  // Generate secure random string for PKCE
  private generateRandomString(length: number): string {
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    const values = crypto.getRandomValues(new Uint8Array(length))
    return values.reduce((acc, x) => acc + possible[x % possible.length], "")
  }

  // Generate PKCE code challenge
  private async generateCodeChallenge(codeVerifier: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(codeVerifier)
    const digest = await crypto.subtle.digest("SHA-256", data)

    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "")
  }

  // Check if token is expired
  private isTokenExpired(): boolean {
    if (!this.tokenExpiry) return true
    return Date.now() >= this.tokenExpiry - 60000 // Refresh 1 minute before expiry
  }

  // Initiate Spotify OAuth flow
  async authenticate(): Promise<void> {
    if (!SPOTIFY_CONFIG.CLIENT_ID) {
      throw new Error("Spotify Client ID is not configured. Please check your environment variables.")
    }

    try {
      const codeVerifier = this.generateRandomString(128)
      const codeChallenge = await this.generateCodeChallenge(codeVerifier)
      const state = this.generateRandomString(16)

      // Store for later verification
      localStorage.setItem("code_verifier", codeVerifier)
      localStorage.setItem("auth_state", state)

      const params = new URLSearchParams({
        response_type: "code",
        client_id: SPOTIFY_CONFIG.CLIENT_ID,
        scope: SPOTIFY_CONFIG.SCOPES,
        redirect_uri: getRedirectUri(),
        code_challenge_method: "S256",
        code_challenge: codeChallenge,
        state: state,
        show_dialog: "true", // Force consent screen for testing
      })

      const authUrl = `${SPOTIFY_CONFIG.AUTH_URL}?${params.toString()}`
      console.log("Redirecting to:", authUrl)

      window.location.href = authUrl
    } catch (error) {
      console.error("Authentication initiation failed:", error)
      throw new Error("Failed to initiate Spotify authentication")
    }
  }

  // Handle OAuth callback
  async handleCallback(code: string, state: string): Promise<boolean> {
    try {
      // Verify state parameter
      const storedState = localStorage.getItem("auth_state")
      if (state !== storedState) {
        throw new Error("Invalid state parameter")
      }

      const codeVerifier = localStorage.getItem("code_verifier")
      if (!codeVerifier) {
        throw new Error("Code verifier not found")
      }

      const response = await fetch(SPOTIFY_CONFIG.TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: code,
          redirect_uri: getRedirectUri(),
          client_id: SPOTIFY_CONFIG.CLIENT_ID,
          code_verifier: codeVerifier,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`Token exchange failed: ${errorData.error_description || response.statusText}`)
      }

      const tokenData = await response.json()
      this.saveTokensToStorage(tokenData.access_token, tokenData.refresh_token, tokenData.expires_in)

      // Clean up
      localStorage.removeItem("code_verifier")
      localStorage.removeItem("auth_state")

      return true
    } catch (error) {
      console.error("Callback handling failed:", error)
      this.clearTokensFromStorage()
      throw error
    }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.accessToken && !this.isTokenExpired()
  }

  // Refresh access token
  async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) {
      return false
    }

    try {
      const response = await fetch(SPOTIFY_CONFIG.TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: this.refreshToken,
          client_id: SPOTIFY_CONFIG.CLIENT_ID,
        }),
      })

      if (!response.ok) {
        console.error("Token refresh failed:", response.status, response.statusText)
        this.clearTokensFromStorage()
        return false
      }

      const tokenData = await response.json()
      this.saveTokensToStorage(
        tokenData.access_token,
        tokenData.refresh_token || this.refreshToken,
        tokenData.expires_in,
      )

      return true
    } catch (error) {
      console.error("Token refresh error:", error)
      this.clearTokensFromStorage()
      return false
    }
  }

  // Make authenticated API request with retry logic
  private async makeRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
    // Check if token needs refresh
    if (this.isTokenExpired() && this.refreshToken) {
      const refreshed = await this.refreshAccessToken()
      if (!refreshed) {
        throw new Error("Authentication expired. Please log in again.")
      }
    }

    if (!this.accessToken) {
      throw new Error("No access token available")
    }

    const requestOptions: RequestInit = {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    }

    try {
      const response = await fetch(url, requestOptions)

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After")
        const waitTime = retryAfter ? Number.parseInt(retryAfter) * 1000 : 1000

        console.log(`Rate limited. Waiting ${waitTime}ms before retry...`)
        await new Promise((resolve) => setTimeout(resolve, waitTime))

        // Retry the request
        return this.makeRequest<T>(url, options)
      }

      // Handle authentication errors
      if (response.status === 401) {
        if (this.refreshToken) {
          const refreshed = await this.refreshAccessToken()
          if (refreshed) {
            // Retry with new token
            return this.makeRequest<T>(url, options)
          }
        }
        this.clearTokensFromStorage()
        throw new Error("Authentication failed. Please log in again.")
      }

      if (!response.ok) {
        const errorData: SpotifyError = await response.json().catch(() => ({
          error: { status: response.status, message: response.statusText },
        }))
        throw new Error(`Spotify API Error: ${errorData.error.message}`)
      }

      return response.json()
    } catch (error) {
      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new Error("Network error. Please check your internet connection.")
      }
      throw error
    }
  }

  // Get current user profile
  async getCurrentUser(): Promise<SpotifyUser> {
    return this.makeRequest<SpotifyUser>(`${SPOTIFY_CONFIG.API_BASE_URL}/me`)
  }

  // Search for tracks
  async searchTrack(query: string, limit = 1): Promise<SpotifyTrack[]> {
    const encodedQuery = encodeURIComponent(query)
    const response = await this.makeRequest<{ tracks: { items: SpotifyTrack[] } }>(
      `${SPOTIFY_CONFIG.API_BASE_URL}/search?q=${encodedQuery}&type=track&limit=${limit}&market=US`,
    )
    return response.tracks.items
  }

  // Create playlist
  async createPlaylist(userId: string, name: string, description: string): Promise<SpotifyPlaylist> {
    return this.makeRequest<SpotifyPlaylist>(`${SPOTIFY_CONFIG.API_BASE_URL}/users/${userId}/playlists`, {
      method: "POST",
      body: JSON.stringify({
        name,
        description,
        public: false,
      }),
    })
  }

  // Add tracks to playlist
  async addTracksToPlaylist(playlistId: string, trackUris: string[]): Promise<void> {
    // Spotify allows max 100 tracks per request
    const chunks = this.chunkArray(trackUris, 100)

    for (const chunk of chunks) {
      await this.makeRequest<{ snapshot_id: string }>(`${SPOTIFY_CONFIG.API_BASE_URL}/playlists/${playlistId}/tracks`, {
        method: "POST",
        body: JSON.stringify({ uris: chunk }),
      })

      // Add delay between requests to avoid rate limiting
      if (chunks.length > 1) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }
  }

  // Logout user
  logout(): void {
    this.clearTokensFromStorage()
  }

  // Utility function to chunk arrays
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }
}

export const spotifyAPI = new SpotifyAPIClient()
