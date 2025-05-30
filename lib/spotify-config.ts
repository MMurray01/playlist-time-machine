// Spotify Configuration and Constants
export const SPOTIFY_CONFIG = {
  CLIENT_ID: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || "20db563517e94795a0ab1ebd2bbb5607",
  SCOPES: [
    "playlist-modify-public",
    "playlist-modify-private",
    "user-read-private",
    "user-read-email",
    "streaming",
    "user-read-playback-state",
    "user-modify-playback-state",
  ].join(" "),
  API_BASE_URL: "https://api.spotify.com/v1",
  AUTH_URL: "https://accounts.spotify.com/authorize",
  TOKEN_URL: "https://accounts.spotify.com/api/token",
}

export const getRedirectUri = (): string => {
  if (typeof window === "undefined") return ""

  // Handle different environments
  const origin = window.location.origin

  // For development
  if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
    return `${origin}/callback`
  }

  // For Vercel preview or production
  return `${origin}/callback`
}

export const validateSpotifyConfig = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []

  if (!SPOTIFY_CONFIG.CLIENT_ID) {
    errors.push("Spotify Client ID is not configured")
  }

  if (typeof window !== "undefined") {
    const redirectUri = getRedirectUri()
    if (!redirectUri.startsWith("https://") && !redirectUri.includes("localhost")) {
      errors.push("Redirect URI must use HTTPS in production")
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

// Helper function to check if we're on Vercel preview
export const isVercelPreview = (): boolean => {
  if (typeof window === "undefined") return false
  return window.location.origin.includes("vercel.app")
}

// Get the appropriate API callback URL based on environment
export const getApiCallbackUrl = (): string => {
  if (typeof window === "undefined") return ""
  return `${window.location.origin}/api/spotify/callback`
}
