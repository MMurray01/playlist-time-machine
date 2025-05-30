/**
 * Spotify Redirect URI Validator
 * Helps debug and validate redirect URI configuration
 */

export interface RedirectURIValidation {
  isValid: boolean
  currentOrigin: string
  expectedCallbackURI: string
  expectedClientURI: string
  errors: string[]
  recommendations: string[]
}

export function validateSpotifyRedirectURIs(): RedirectURIValidation {
  const errors: string[] = []
  const recommendations: string[] = []

  // Get current origin
  const currentOrigin = typeof window !== "undefined" ? window.location.origin : ""

  if (!currentOrigin) {
    errors.push("Cannot determine current origin (running on server)")
    return {
      isValid: false,
      currentOrigin: "",
      expectedCallbackURI: "",
      expectedClientURI: "",
      errors,
      recommendations,
    }
  }

  // Generate expected URIs
  const expectedCallbackURI = `${currentOrigin}/api/spotify/callback`
  const expectedClientURI = `${currentOrigin}/callback`

  // Validate protocol
  if (currentOrigin.startsWith("http://") && !currentOrigin.includes("localhost")) {
    errors.push("Production apps should use HTTPS, not HTTP")
    recommendations.push("Deploy your app with HTTPS enabled")
  }

  // Check for common issues
  if (currentOrigin.endsWith("/")) {
    errors.push("Origin should not end with a trailing slash")
  }

  // Validate Client ID
  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID
  if (!clientId) {
    errors.push("NEXT_PUBLIC_SPOTIFY_CLIENT_ID environment variable is not set")
    recommendations.push("Set your Spotify Client ID in environment variables")
  }

  // Generate recommendations
  recommendations.push(
    `Add these exact URIs to your Spotify app settings:`,
    `1. ${expectedCallbackURI}`,
    `2. ${expectedClientURI}`,
    ``,
    `For development, also add:`,
    `1. http://localhost:3000/api/spotify/callback`,
    `2. http://localhost:3000/callback`,
  )

  return {
    isValid: errors.length === 0,
    currentOrigin,
    expectedCallbackURI,
    expectedClientURI,
    errors,
    recommendations,
  }
}

export function logRedirectURIDebugInfo(): void {
  const validation = validateSpotifyRedirectURIs()

  console.group("🎵 Spotify Redirect URI Debug Info")
  console.log("Current Origin:", validation.currentOrigin)
  console.log("Expected Callback URI:", validation.expectedCallbackURI)
  console.log("Expected Client URI:", validation.expectedClientURI)

  if (validation.errors.length > 0) {
    console.group("❌ Errors:")
    validation.errors.forEach((error) => console.error(error))
    console.groupEnd()
  }

  if (validation.recommendations.length > 0) {
    console.group("💡 Recommendations:")
    validation.recommendations.forEach((rec) => console.log(rec))
    console.groupEnd()
  }

  console.groupEnd()
}
