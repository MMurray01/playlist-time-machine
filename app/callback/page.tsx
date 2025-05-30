"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, Loader2, AlertTriangle } from "lucide-react"
import { spotifyClient } from "@/lib/spotify-client"

export default function SpotifyCallback() {
  return (
    <Suspense fallback={<CallbackLoading />}>
      <SpotifyCallbackContent />
    </Suspense>
  )
}

function CallbackLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-sm mx-auto w-full">
        <Card>
          <CardHeader className="text-center pb-4">
            <CardTitle className="flex items-center justify-center gap-2 text-lg sm:text-xl">
              <Loader2 className="h-5 w-5 animate-spin" />
              Connecting to Spotify
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm sm:text-base text-gray-600">
              Please wait while we connect to your Spotify account...
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function SpotifyCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")
  const [debugInfo, setDebugInfo] = useState<string[]>([])

  useEffect(() => {
    handleCallback()
  }, [searchParams])

  const handleCallback = async () => {
    const debug: string[] = []

    try {
      console.log("=== Spotify OAuth Callback Handler ===")

      const code = searchParams.get("code")
      const state = searchParams.get("state")
      const error = searchParams.get("error")
      const errorDescription = searchParams.get("error_description")

      debug.push(`Callback URL parameters:`)
      debug.push(`- code: ${code ? "✓ present" : "✗ missing"}`)
      debug.push(`- state: ${state ? "✓ present" : "✗ missing"}`)
      debug.push(`- error: ${error || "none"}`)
      debug.push(`- error_description: ${errorDescription || "none"}`)

      console.log("Callback parameters:", {
        hasCode: !!code,
        hasState: !!state,
        error,
        errorDescription,
      })

      // Handle OAuth errors from Spotify
      if (error) {
        debug.push(`❌ OAuth error received: ${error}`)
        if (errorDescription) {
          debug.push(`   Description: ${errorDescription}`)
        }

        let userFriendlyMessage = "Spotify authorization failed"
        switch (error) {
          case "access_denied":
            userFriendlyMessage = "You denied access to Spotify. Please try again if you want to connect."
            break
          case "invalid_client":
            userFriendlyMessage = "Invalid Spotify app configuration. Please contact support."
            break
          case "invalid_request":
            userFriendlyMessage = "Invalid authorization request. Please try again."
            break
          case "server_error":
            userFriendlyMessage = "Spotify server error. Please try again later."
            break
          default:
            userFriendlyMessage = `Spotify authorization failed: ${error}`
        }

        setStatus("error")
        setMessage(userFriendlyMessage)
        setDebugInfo(debug)
        return
      }

      // Validate required parameters
      if (!code || !state) {
        debug.push("❌ Missing required OAuth parameters")
        setStatus("error")
        setMessage("Missing required parameters from Spotify. Please try connecting again.")
        setDebugInfo(debug)
        return
      }

      debug.push("✓ OAuth parameters validated")
      debug.push("🔄 Attempting to exchange code for tokens...")
      console.log("Handling OAuth callback with spotifyClient...")

      // Handle the callback using our client service
      const success = await spotifyClient.handleCallback(code, state)

      if (success) {
        debug.push("✅ OAuth callback handled successfully")
        debug.push("✅ Access tokens received and stored")

        // Test the authentication by getting user info
        try {
          debug.push("🔄 Verifying authentication by fetching user profile...")
          const user = await spotifyClient.getCurrentUser()
          debug.push(`✅ User authenticated: ${user.display_name || user.email || user.id}`)

          setStatus("success")
          setMessage(`Successfully connected to Spotify as ${user.display_name || user.email}!`)
          setDebugInfo(debug)

          // Redirect back to main app after 2 seconds
          setTimeout(() => {
            console.log("Redirecting back to main app...")
            router.push("/")
          }, 2000)
        } catch (userError) {
          debug.push(`❌ Failed to verify user authentication: ${userError}`)
          console.error("Failed to get user info after token exchange:", userError)

          setStatus("error")
          setMessage("Connected to Spotify but failed to verify your account. Please try again.")
          setDebugInfo(debug)
        }
      } else {
        debug.push("❌ OAuth callback handling failed")
        setStatus("error")
        setMessage("Failed to connect to Spotify. Please check your internet connection and try again.")
        setDebugInfo(debug)
      }
    } catch (error) {
      console.error("Error during callback handling:", error)
      debug.push(`❌ Exception during callback: ${error instanceof Error ? error.message : "Unknown error"}`)

      setStatus("error")
      setMessage("An unexpected error occurred during authentication. Please try again.")
      setDebugInfo(debug)
    }
  }

  const handleRetry = () => {
    console.log("User requested retry, redirecting to main app")
    router.push("/")
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md mx-auto w-full">
        <Card>
          <CardHeader className="text-center pb-4">
            <CardTitle className="flex items-center justify-center gap-2 text-lg sm:text-xl">
              {status === "loading" && <Loader2 className="h-5 w-5 animate-spin text-blue-600" />}
              {status === "success" && <CheckCircle className="h-5 w-5 text-green-600" />}
              {status === "error" && <XCircle className="h-5 w-5 text-red-600" />}
              Spotify Connection
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p
              className={`text-sm sm:text-base ${
                status === "success" ? "text-green-600" : status === "error" ? "text-red-600" : "text-gray-600"
              }`}
            >
              {message || "Processing Spotify authentication..."}
            </p>

            {status === "success" && (
              <div className="space-y-2">
                <p className="text-xs sm:text-sm text-gray-500">Redirecting you back to the app...</p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full animate-pulse" style={{ width: "100%" }}></div>
                </div>
              </div>
            )}

            {status === "error" && (
              <div className="space-y-3">
                <Button onClick={handleRetry} className="w-full bg-green-500 hover:bg-green-600 text-white">
                  Return to App
                </Button>

                {process.env.NODE_ENV === "development" && debugInfo.length > 0 && (
                  <details className="text-left">
                    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Debug Information (Development Only)
                    </summary>
                    <div className="mt-2 bg-gray-50 border rounded p-2 max-h-40 overflow-y-auto">
                      <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono">{debugInfo.join("\n")}</pre>
                    </div>
                  </details>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
