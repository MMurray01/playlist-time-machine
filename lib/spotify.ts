const SPOTIFY_CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || ""
const REDIRECT_URI = typeof window !== "undefined" ? `${window.location.origin}/callback` : ""

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
}

export interface SpotifySearchResult {
  tracks: {
    items: SpotifyTrack[]
  }
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

class SpotifyAPI {
  private accessToken: string | null = null

  constructor() {
    if (typeof window !== "undefined") {
      this.accessToken = localStorage.getItem("spotify_access_token")
    }
  }

  // Generate PKCE challenge for secure OAuth
  private async generateCodeChallenge(codeVerifier: string): Promise<string> {
    const data = new TextEncoder().encode(codeVerifier)
    const digest = await window.crypto.subtle.digest("SHA-256", data)
    return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "")
  }

  private generateRandomString(length: number): string {
    let text = ""
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"

    for (let i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length))
    }
    return text
  }

  // Initiate Spotify OAuth flow
  async authenticate(): Promise<void> {
    if (!SPOTIFY_CLIENT_ID) {
      throw new Error("Spotify Client ID is not configured")
    }

    const codeVerifier = this.generateRandomString(128)
    const codeChallenge = await this.generateCodeChallenge(codeVerifier)

    localStorage.setItem("code_verifier", codeVerifier)

    const params = new URLSearchParams({
      response_type: "code",
      client_id: SPOTIFY_CLIENT_ID,
      scope: "playlist-modify-public playlist-modify-private user-read-private user-read-email",
      redirect_uri: REDIRECT_URI,
      code_challenge_method: "S256",
      code_challenge: codeChallenge,
    })

    window.location.href = `https://accounts.spotify.com/authorize?${params}`
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.accessToken
  }

  // Get current user info
  async getCurrentUser(): Promise<SpotifyUser> {
    const response = await this.makeRequest("https://api.spotify.com/v1/me")
    return response
  }

  // Search for a track
  async searchTrack(query: string): Promise<SpotifyTrack | null> {
    try {
      const encodedQuery = encodeURIComponent(query)
      const response = await this.makeRequest(`https://api.spotify.com/v1/search?q=${encodedQuery}&type=track&limit=1`)

      if (response.tracks.items.length > 0) {
        return response.tracks.items[0]
      }
      return null
    } catch (error) {
      console.error("Error searching for track:", error)
      return null
    }
  }

  // Create a new playlist
  async createPlaylist(userId: string, name: string, description: string): Promise<SpotifyPlaylist> {
    const response = await this.makeRequest(`https://api.spotify.com/v1/users/${userId}/playlists`, {
      method: "POST",
      body: JSON.stringify({
        name,
        description,
        public: false,
      }),
    })
    return response
  }

  // Add tracks to playlist
  async addTracksToPlaylist(playlistId: string, trackUris: string[]): Promise<void> {
    // Spotify API allows max 100 tracks per request
    const chunks = this.chunkArray(trackUris, 100)

    for (const chunk of chunks) {
      await this.makeRequest(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        method: "POST",
        body: JSON.stringify({
          uris: chunk,
        }),
      })
    }
  }

  // Refresh access token
  async refreshToken(): Promise<boolean> {
    const refreshToken = localStorage.getItem("spotify_refresh_token")
    if (!refreshToken) {
      return false
    }

    try {
      const response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: SPOTIFY_CLIENT_ID,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        this.accessToken = data.access_token
        localStorage.setItem("spotify_access_token", data.access_token)

        if (data.refresh_token) {
          localStorage.setItem("spotify_refresh_token", data.refresh_token)
        }

        return true
      }
    } catch (error) {
      console.error("Error refreshing token:", error)
    }

    return false
  }

  // Logout user
  logout(): void {
    this.accessToken = null
    localStorage.removeItem("spotify_access_token")
    localStorage.removeItem("spotify_refresh_token")
    localStorage.removeItem("code_verifier")
  }

  // Make authenticated request to Spotify API
  private async makeRequest(url: string, options: RequestInit = {}): Promise<any> {
    if (!this.accessToken) {
      throw new Error("No access token available")
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    })

    if (response.status === 401) {
      // Token expired, try to refresh
      const refreshed = await this.refreshToken()
      if (refreshed) {
        // Retry the request with new token
        return this.makeRequest(url, options)
      } else {
        throw new Error("Authentication failed")
      }
    }

    if (response.status === 429) {
      // Rate limited
      const retryAfter = response.headers.get("Retry-After")
      throw new Error(`Rate limited. Retry after ${retryAfter} seconds`)
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
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

export const spotifyAPI = new SpotifyAPI()
