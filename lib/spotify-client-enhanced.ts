/**
 * Enhanced Spotify Client - v10.1 (Focus on robust initialization and error handling)
 */

interface SpotifyTokens {
  accessToken: string
  refreshToken?: string
  expiresAt: number // Timestamp in milliseconds
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
  album: { name: string; images: Array<{ url: string; height: number; width: number }> }
}
interface SpotifyPlaylist {
  id: string
  name: string
  external_urls: { spotify: string }
  tracks: { total: number }
}

const SPOTIFY_TOKENS_KEY = "spotify_tokens_v10.1" // Incremented version
const SPOTIFY_CODE_VERIFIER_KEY = "spotify_code_verifier_v10.1"
const SPOTIFY_AUTH_STATE_KEY = "spotify_auth_state_v10.1"
const SPOTIFY_AUTH_RETURN_URL_KEY = "spotify_auth_return_url_v10.1"
const CLIENT_CALLBACK_PATH = "/app-spotify-auth-callback"

class EnhancedSpotifyClient {
  private tokens: SpotifyTokens | null = null
  private authListeners: Set<() => void> = new Set()
  private debugMode = false
  private isClientInitialized = false

  constructor() {
    if (typeof window !== "undefined") {
      this.isClientInitialized = true
      try {
        this.debugMode =
          window.location.search.includes("debug=true") || localStorage.getItem("spotify_debug_mode") === "true"
        if (this.debugMode) localStorage.setItem("spotify_debug_mode", "true")
        this.log("Initializing Spotify Client (v10.1)")
        this.loadTokensFromStorage()
      } catch (e) {
        console.error("[SpotifyClient] CRITICAL: Error during constructor/initialization:", e)
        // If localStorage is blocked or fails, we might be in a bad state.
        // Allow the app to continue but auth will likely fail.
        this.debugMode = true // Force debug mode to see logs
        this.log("Constructor failed, debugMode forced. Auth will likely not work.")
      }
    } else {
      // This case should ideally not happen if instantiated in client components correctly.
      console.warn(
        "[SpotifyClient] WARNING: Instantiated on server or pre-client environment. Auth features will be unavailable until client-side hydration.",
      )
    }
  }

  private log(message: string, data?: any) {
    if (this.debugMode) {
      const timestamp = new Date().toISOString()
      console.log(`[SpotifyClient ${timestamp}] ${message}`, data !== undefined ? data : "")
    }
  }

  public addAuthListener(callback: () => void): void {
    if (!this.isClientInitialized) return
    this.authListeners.add(callback)
  }

  public removeAuthListener(callback: () => void): void {
    if (!this.isClientInitialized) return
    this.authListeners.delete(callback)
  }

  private notifyAuthChange(): void {
    if (!this.isClientInitialized) return
    this.log("Notifying auth listeners of change.")
    this.authListeners.forEach((cb) => cb())
    window.dispatchEvent(
      new CustomEvent("spotify-auth-changed", { detail: { isAuthenticated: this.isAuthenticated() } }),
    )
  }

  private generateRandomString(length: number): string {
    if (!this.isClientInitialized) throw new Error("Client not initialized for generateRandomString")
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    let result = ""
    if (window.crypto && window.crypto.getRandomValues) {
      const array = new Uint8Array(length)
      window.crypto.getRandomValues(array)
      for (let i = 0; i < length; i++) {
        result += possible[array[i] % possible.length]
      }
      return result
    }
    for (let i = 0; i < length; i++) {
      result += possible.charAt(Math.floor(Math.random() * possible.length))
    }
    return result
  }

  private async generateCodeChallenge(codeVerifier: string): Promise<string> {
    if (!this.isClientInitialized) throw new Error("Client not initialized for generateCodeChallenge")
    if (!window.crypto || !window.crypto.subtle) {
      this.log("Crypto.subtle not available. PKCE will use plain challenge.")
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

  private loadTokensFromStorage(): void {
    if (!this.isClientInitialized) return
    try {
      const storedTokens = localStorage.getItem(SPOTIFY_TOKENS_KEY)
      if (storedTokens) {
        this.tokens = JSON.parse(storedTokens)
        this.log("Loaded tokens from storage.", {
          hasAccessToken: !!this.tokens?.accessToken,
          isExpired: this.tokens ? Date.now() >= this.tokens.expiresAt : "N/A",
        })
        // isAuthenticated will handle expiry and notify listeners
        this.isAuthenticated()
      } else {
        this.log("No tokens found in storage.")
      }
    } catch (e) {
      this.log("Error loading tokens from storage. Clearing tokens.", e)
      this.clearTokens() // Clear potentially corrupted data
    }
  }

  private saveTokensToStorage(): void {
    if (!this.isClientInitialized || !this.tokens) return
    try {
      localStorage.setItem(SPOTIFY_TOKENS_KEY, JSON.stringify(this.tokens))
      this.log("Saved tokens to storage.")
    } catch (e) {
      this.log("Error saving tokens to storage.", e)
      // This is problematic, user might lose auth state on refresh.
    }
  }

  private clearTokens(): void {
    this.tokens = null
    if (!this.isClientInitialized) return
    try {
      localStorage.removeItem(SPOTIFY_TOKENS_KEY)
      this.log("Cleared tokens from storage.")
    } catch (e) {
      this.log("Error clearing tokens from storage.", e)
    }
    this.notifyAuthChange()
  }

  private clearPkceStorage(): void {
    if (!this.isClientInitialized) return
    try {
      localStorage.removeItem(SPOTIFY_CODE_VERIFIER_KEY)
      localStorage.removeItem(SPOTIFY_AUTH_STATE_KEY)
      this.log("Cleared PKCE auth storage (verifier, state).")
    } catch (e) {
      this.log("Error clearing PKCE storage.", e)
    }
  }

  public isAuthenticated(): boolean {
    if (!this.isClientInitialized) return false
    if (!this.tokens || !this.tokens.accessToken) {
      // this.log("isAuthenticated: No tokens or access token."); // Can be noisy
      return false
    }
    if (Date.now() >= this.tokens.expiresAt - 60000) {
      this.log("isAuthenticated: Token expired or about to expire.")
      this.clearTokens() // Clears tokens and notifies listeners
      return false
    }
    // this.log("isAuthenticated: Token valid."); // Can be noisy
    return true
  }

  public async startAuthFlow(): Promise<void> {
    if (!this.isClientInitialized) {
      this.log("startAuthFlow: Client not initialized. Aborting.")
      throw new Error("Spotify client not ready. Please try again shortly.")
    }
    this.log("Starting Spotify auth flow (v10.1).")
    try {
      const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID
      if (!clientId) {
        this.log("Spotify Client ID not configured.")
        throw new Error("Spotify Client ID not configured")
      }

      const codeVerifier = this.generateRandomString(128)
      const codeChallenge = await this.generateCodeChallenge(codeVerifier)
      const state = this.generateRandomString(16)

      localStorage.setItem(SPOTIFY_CODE_VERIFIER_KEY, codeVerifier)
      localStorage.setItem(SPOTIFY_AUTH_STATE_KEY, state)
      localStorage.setItem(SPOTIFY_AUTH_RETURN_URL_KEY, window.location.pathname + window.location.search)
      this.log("Stored PKCE params and return URL.", { returnUrl: window.location.pathname + window.location.search })

      const serverCallbackUri = `${window.location.origin}/api/spotify/callback`
      const authUrl = new URL("https://accounts.spotify.com/authorize")
      authUrl.searchParams.append("client_id", clientId)
      authUrl.searchParams.append("response_type", "code")
      authUrl.searchParams.append("redirect_uri", serverCallbackUri)
      authUrl.searchParams.append(
        "scope",
        "user-read-private user-read-email playlist-modify-public playlist-modify-private",
      )
      authUrl.searchParams.append("state", state)
      authUrl.searchParams.append("code_challenge_method", "S256")
      authUrl.searchParams.append("code_challenge", codeChallenge)

      this.log("Redirecting to Spotify for authorization.", { url: authUrl.toString() })
      window.location.href = authUrl.toString()
    } catch (error) {
      this.log("Error in startAuthFlow before redirect.", error)
      // Dispatch a global error event so UI components can react if needed
      window.dispatchEvent(
        new CustomEvent("spotify-auth-error", {
          detail: { error: error instanceof Error ? error.message : "start_auth_flow_failed" },
        }),
      )
      throw error // Re-throw for the calling component to handle if it wants
    }
  }

  public async handleAuthCallback(code: string, stateFromUrl: string): Promise<void> {
    if (!this.isClientInitialized) throw new Error("Client not initialized for handleAuthCallback")
    this.log("handleAuthCallback (v10.1): Processing code and state.", { code: !!code, stateFromUrl: !!stateFromUrl })
    let storedState, codeVerifier
    try {
      storedState = localStorage.getItem(SPOTIFY_AUTH_STATE_KEY)
      codeVerifier = localStorage.getItem(SPOTIFY_CODE_VERIFIER_KEY)
    } catch (e) {
      this.log("handleAuthCallback: Failed to read from localStorage for PKCE values.", e)
      throw new Error("storage_read_failure_callback")
    }

    if (stateFromUrl !== storedState) {
      this.log("State mismatch in handleAuthCallback.")
      this.clearPkceStorage()
      throw new Error("state_mismatch_failure")
    }
    if (!codeVerifier) {
      this.log("Code verifier not found in handleAuthCallback.")
      this.clearPkceStorage()
      throw new Error("missing_code_verifier_failure")
    }

    try {
      const response = await fetch("/api/spotify/token", {
        /* ... */
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          codeVerifier,
          redirectUri: `${window.location.origin}/api/spotify/callback`,
        }),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        this.log("Token exchange failed in handleAuthCallback.", { status: response.status, errorData })
        throw new Error(errorData.error_description || errorData.error || `token_exchange_failure_${response.status}`)
      }

      const tokenData = await response.json()
      this.tokens = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: Date.now() + tokenData.expires_in * 1000,
      }
      this.saveTokensToStorage()
      this.log("Token exchange successful, tokens stored.")
      this.notifyAuthChange()
    } catch (err) {
      this.log("Error during token exchange in handleAuthCallback.", err)
      this.clearTokens()
      throw err
    } finally {
      this.clearPkceStorage()
    }
  }

  public async getValidToken(): Promise<string> {
    if (!this.isClientInitialized) throw new Error("Client not initialized for getValidToken")
    if (this.isAuthenticated() && this.tokens) {
      return this.tokens.accessToken
    }
    this.log("No valid token. Need to re-authenticate.")
    throw new Error("authentication_required")
  }
  public async getCurrentUser(): Promise<SpotifyUser> {
    if (!this.isClientInitialized) throw new Error("Client not initialized for getCurrentUser")
    const token = await this.getValidToken()
    const response = await fetch("https://api.spotify.com/v1/me", { headers: { Authorization: `Bearer ${token}` } })
    if (!response.ok) {
      this.log("Failed to get user profile.", { status: response.status })
      if (response.status === 401) throw new Error("unauthorized_profile_fetch")
      throw new Error(`Failed to get user profile: ${response.status}`)
    }
    return response.json()
  }
  public async searchTracks(query: string, limit = 10): Promise<SpotifyTrack[]> {
    if (!this.isClientInitialized) throw new Error("Client not initialized for searchTracks")
    const token = await this.getValidToken()
    const params = new URLSearchParams({ q: query, type: "track", limit: String(limit), market: "US" })
    const response = await fetch(`https://api.spotify.com/v1/search?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) {
      this.log("Search failed.", { status: response.status })
      if (response.status === 401) throw new Error("unauthorized_search")
      throw new Error(`Search failed: ${response.status}`)
    }
    const data = await response.json()
    return data.tracks?.items || []
  }
  public async createPlaylist(
    userId: string,
    name: string,
    description = "",
    trackUris: string[] = [],
  ): Promise<SpotifyPlaylist> {
    if (!this.isClientInitialized) throw new Error("Client not initialized for createPlaylist")
    const token = await this.getValidToken()
    this.log(`Creating playlist "${name}" for user ${userId}.`)
    const createResponse = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, public: false }),
    })
    if (!createResponse.ok) {
      const errorData = await createResponse.json().catch(() => ({}))
      this.log("Failed to create playlist.", { status: createResponse.status, errorData })
      if (createResponse.status === 401) throw new Error("unauthorized_playlist_create")
      throw new Error(errorData.error?.message || `Failed to create playlist: ${createResponse.status}`)
    }
    const playlist: SpotifyPlaylist = await createResponse.json()
    this.log("Playlist created successfully.", { playlistId: playlist.id })
    if (trackUris.length > 0) {
      this.log(`Adding ${trackUris.length} tracks to playlist ${playlist.id}.`)
      for (let i = 0; i < trackUris.length; i += 100) {
        const batch = trackUris.slice(i, i + 100)
        const addResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ uris: batch }),
        })
        if (!addResponse.ok) {
          this.log(`Failed to add batch of tracks to playlist ${playlist.id}.`, { status: addResponse.status })
        } else {
          this.log(`Added batch of ${batch.length} tracks to playlist ${playlist.id}.`)
        }
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }
    return playlist
  }
  public logout(): void {
    if (!this.isClientInitialized) {
      this.log("Logout called but client not initialized.")
      return
    }
    this.log("Logging out (v10.1).")
    this.clearTokens()
    this.clearPkceStorage()
    try {
      localStorage.removeItem(SPOTIFY_AUTH_RETURN_URL_KEY)
    } catch (e) {
      this.log("Error clearing return URL on logout", e)
    }
  }
}

// Export singleton instance
export const spotifyClient = new EnhancedSpotifyClient()
export type { SpotifyUser, SpotifyTrack, SpotifyPlaylist }
