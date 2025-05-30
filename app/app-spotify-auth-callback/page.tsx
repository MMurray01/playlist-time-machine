"use client"
import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { spotifyClient } from "@/lib/spotify-client-enhanced"
import { Loader2, AlertTriangle } from "lucide-react"

const SPOTIFY_AUTH_RETURN_URL_KEY = "spotify_auth_return_url_v10.1" // Ensure this matches client

export default function SpotifyAuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [statusMessage, setStatusMessage] = useState("Processing Spotify authentication...")
  const [errorDetails, setErrorDetails] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(true)

  useEffect(() => {
    console.log("[SpotifyAuthCallbackPage] Mounted. Processing auth...")
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const callbackError = searchParams.get("error") // Error from Spotify itself

    const processAuthentication = async () => {
      setIsProcessing(true)
      setErrorDetails(null)
      try {
        if (callbackError) {
          console.error("[SpotifyAuthCallbackPage] Error from Spotify redirect:", callbackError, "State:", state)
          throw new Error(`Spotify authentication failed: ${callbackError}. Please try again.`)
        }
        if (code && state) {
          console.log("[SpotifyAuthCallbackPage] Code and State received. Calling spotifyClient.handleAuthCallback.")
          await spotifyClient.handleAuthCallback(code, state)
          setStatusMessage("Authentication successful! Redirecting...")
          console.log("[SpotifyAuthCallbackPage] Auth successful. Retrieving return URL.")

          let returnUrl = "/" // Default fallback
          try {
            returnUrl = localStorage.getItem(SPOTIFY_AUTH_RETURN_URL_KEY) || "/"
            localStorage.removeItem(SPOTIFY_AUTH_RETURN_URL_KEY) // Clean up immediately
            console.log("[SpotifyAuthCallbackPage] Return URL:", returnUrl)
          } catch (e) {
            console.error("[SpotifyAuthCallbackPage] Error accessing localStorage for return URL:", e)
            setStatusMessage("Auth successful, but failed to get return URL. Redirecting to home.")
          }

          router.replace(returnUrl)
        } else {
          console.error(
            "[SpotifyAuthCallbackPage] Invalid parameters: Code or State missing and no error from Spotify.",
          )
          throw new Error("Invalid authentication callback parameters. Code or state missing.")
        }
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "An unknown error occurred during authentication."
        console.error("[SpotifyAuthCallbackPage] CRITICAL Error processing Spotify auth:", errorMessage, e)
        setErrorDetails(errorMessage)
        setStatusMessage("Authentication Failed")
        // Dispatch a global error event so other parts of the app might react
        window.dispatchEvent(new CustomEvent("spotify-auth-error", { detail: { error: errorMessage } }))
      } finally {
        setIsProcessing(false)
      }
    }

    processAuthentication()
  }, [router, searchParams]) // searchParams is stable from Next.js App Router

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-6 bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl max-w-md w-full">
        {isProcessing && (
          <Loader2 className="h-12 w-12 animate-spin text-purple-600 dark:text-purple-400 mx-auto mb-6" />
        )}
        {!isProcessing && errorDetails && (
          <AlertTriangle className="h-12 w-12 text-red-500 dark:text-red-400 mx-auto mb-4" />
        )}
        {!isProcessing && !errorDetails && (
          <svg
            className="h-12 w-12 text-green-500 dark:text-green-400 mx-auto mb-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )}

        <p className="text-xl font-semibold mb-3 text-gray-700 dark:text-gray-200">{statusMessage}</p>

        {errorDetails && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 rounded-md text-left">
            <p className="font-bold text-sm">Error Details:</p>
            <p className="text-xs break-words">{errorDetails}</p>
            <button
              onClick={() => {
                let returnUrl = "/"
                try {
                  returnUrl = localStorage.getItem(SPOTIFY_AUTH_RETURN_URL_KEY) || "/"
                  localStorage.removeItem(SPOTIFY_AUTH_RETURN_URL_KEY)
                } catch (e) {
                  console.error("Error getting/removing return URL on error retry:", e)
                }
                router.replace(returnUrl)
              }}
              className="mt-4 w-full px-4 py-2 bg-purple-600 dark:bg-purple-500 text-white text-sm rounded-md hover:bg-purple-700 dark:hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            >
              Return to Previous Page
            </button>
          </div>
        )}
        {!errorDetails && !isProcessing && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">You are being redirected...</p>
        )}
        {isProcessing && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Please wait, this should only take a moment.</p>
        )}
      </div>
    </div>
  )
}
