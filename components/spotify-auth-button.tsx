"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Music, AlertCircle, LogOut, Loader2 } from "lucide-react"
import { spotifyClient } from "@/lib/spotify-client-enhanced" // Ensure this path is correct

interface SpotifyAuthButtonProps {
  onAuthSuccess?: () => void // Callback for successful authentication
  onAuthError?: (error: string) => void // Callback for authentication error
  className?: string
  variant?: "default" | "outline" | "ghost" | "secondary" | "link" | "destructive" | null | undefined
  size?: "default" | "sm" | "lg" | "icon" | null | undefined
}

export function SpotifyAuthButton({
  onAuthSuccess,
  onAuthError,
  className = "",
  variant = "default",
  size = "default",
}: SpotifyAuthButtonProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false) // True when auth flow is initiated
  const [error, setError] = useState<string | null>(null)

  // Memoized callback for the auth listener
  const handleAuthStateChange = useCallback(() => {
    const authStatus = spotifyClient.isAuthenticated()
    console.log("SpotifyAuthButton: Auth state changed, isAuthenticated:", authStatus)
    setIsAuthenticated(authStatus)
    setIsConnecting(false) // Reset connecting state after any auth attempt/change
    if (authStatus) {
      setError(null) // Clear errors on successful auth
      onAuthSuccess?.()
    }
  }, [onAuthSuccess])

  useEffect(() => {
    // Initial state check
    handleAuthStateChange()

    spotifyClient.addAuthListener(handleAuthStateChange)

    // Listen for global auth errors that might be dispatched from other parts of the app
    // (e.g., the callback page if it encounters an issue not directly tied to this button's action)
    const handleGlobalAuthError = (event: Event) => {
      const customEvent = event as CustomEvent
      const errorMessage = customEvent.detail?.error || "An unspecified authentication error occurred."
      console.error("SpotifyAuthButton: Received global auth error:", errorMessage)
      setError(errorMessage)
      setIsAuthenticated(false) // Ensure UI reflects non-auth state
      setIsConnecting(false)
      onAuthError?.(errorMessage)
    }
    window.addEventListener("spotify-auth-error", handleGlobalAuthError)

    return () => {
      spotifyClient.removeAuthListener(handleAuthStateChange)
      window.removeEventListener("spotify-auth-error", handleGlobalAuthError)
    }
  }, [handleAuthStateChange, onAuthError])

  const handleConnectOrDisconnect = async () => {
    if (isAuthenticated) {
      // Perform logout
      spotifyClient.logout()
      // Auth state change will be picked up by the listener
      console.log("SpotifyAuthButton: Logout initiated.")
    } else {
      // Perform login
      setIsConnecting(true)
      setError(null)
      try {
        await spotifyClient.startAuthFlow()
        // Page will redirect. If startAuthFlow itself throws an error before redirect, catch it.
        // setIsConnecting(false) will be handled by the auth listener upon return or if startAuthFlow fails.
        console.log("SpotifyAuthButton: Auth flow started.")
      } catch (err) {
        console.error("SpotifyAuthButton: Error starting auth flow:", err)
        const errorMsg = err instanceof Error ? err.message : "Failed to initiate Spotify connection."
        setError(errorMsg)
        onAuthError?.(errorMsg)
        setIsConnecting(false) // Explicitly set here if startAuthFlow throws synchronously
      }
    }
  }

  if (isAuthenticated) {
    return (
      <Button
        onClick={handleConnectOrDisconnect}
        variant={variant === "default" ? "outline" : variant}
        size={size}
        className={`${className} border-green-600 text-green-700 hover:bg-green-50 dark:border-green-500 dark:text-green-400 dark:hover:bg-green-900/20`}
        aria-label="Disconnect from Spotify"
      >
        <LogOut className="h-4 w-4 mr-2" />
        Disconnect Spotify
      </Button>
    )
  }

  return (
    <div className="space-y-2 w-full">
      <Button
        onClick={handleConnectOrDisconnect}
        disabled={isConnecting}
        variant={variant}
        size={size}
        className={`${className} ${variant === "default" ? "bg-green-500 hover:bg-green-600 text-white" : ""}`}
        aria-label="Connect to Spotify"
      >
        {isConnecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Music className="h-4 w-4 mr-2" />}
        {isConnecting ? "Connecting..." : "Connect to Spotify"}
      </Button>
      {error && (
        <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 p-1 rounded" role="alert">
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
