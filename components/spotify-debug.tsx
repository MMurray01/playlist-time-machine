"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Bug } from "lucide-react"
import { isSpotifyAuthenticated, getSpotifyToken, clearSpotifyAuth } from "@/lib/spotify-auth"

export function SpotifyDebug() {
  const [isVisible, setIsVisible] = useState(false)
  const [debugInfo, setDebugInfo] = useState<Record<string, any>>({})
  const [error, setError] = useState<string | null>(null)

  const runDiagnostics = async () => {
    try {
      setError(null)
      const info: Record<string, any> = {
        timestamp: new Date().toISOString(),
        isAuthenticated: isSpotifyAuthenticated(),
        environment: process.env.NODE_ENV,
        clientId: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID ? "Configured" : "Missing",
      }

      // Check localStorage
      try {
        info.localStorage = {
          token: !!localStorage.getItem("spotify_token"),
          expiry: localStorage.getItem("spotify_expiry"),
          refreshToken: !!localStorage.getItem("spotify_refresh_token"),
        }
      } catch (e) {
        info.localStorage = "Error accessing localStorage"
      }

      // Test token
      if (info.isAuthenticated) {
        try {
          const token = await getSpotifyToken()
          info.tokenAvailable = !!token

          if (token) {
            // Test API call
            const response = await fetch("https://api.spotify.com/v1/me", {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            })

            info.apiTest = {
              status: response.status,
              ok: response.ok,
            }

            if (response.ok) {
              const userData = await response.json()
              info.user = {
                id: userData.id,
                name: userData.display_name,
                email: userData.email,
              }
            } else {
              const errorText = await response.text()
              info.apiError = errorText
            }
          }
        } catch (e) {
          info.tokenError = e instanceof Error ? e.message : "Unknown error"
        }
      }

      // Check CORS headers
      try {
        const corsResponse = await fetch("/api/spotify-cors-test")
        info.corsTest = {
          status: corsResponse.status,
          ok: corsResponse.ok,
        }

        if (corsResponse.ok) {
          const corsData = await corsResponse.json()
          info.corsData = corsData
        }
      } catch (e) {
        info.corsError = e instanceof Error ? e.message : "Unknown error"
      }

      setDebugInfo(info)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error during diagnostics")
    }
  }

  useEffect(() => {
    // Only run in development
    if (process.env.NODE_ENV === "development") {
      setIsVisible(true)
    }
  }, [])

  if (!isVisible) return null

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        variant="outline"
        size="sm"
        className="bg-yellow-100 border-yellow-300 text-yellow-800 hover:bg-yellow-200"
        onClick={() => runDiagnostics()}
      >
        <Bug className="h-4 w-4 mr-1" />
        Spotify Debug
      </Button>

      {Object.keys(debugInfo).length > 0 && (
        <Card className="absolute bottom-full right-0 mb-2 w-80 max-h-96 overflow-auto">
          <CardHeader className="py-2">
            <CardTitle className="text-sm flex items-center gap-1">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              Spotify Debug Info
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2 text-xs">
            {error && <div className="bg-red-50 p-2 rounded mb-2 text-red-800">Error: {error}</div>}
            <pre className="whitespace-pre-wrap">{JSON.stringify(debugInfo, null, 2)}</pre>
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="outline" className="text-xs" onClick={() => setDebugInfo({})}>
                Clear
              </Button>
              <Button size="sm" variant="outline" className="text-xs" onClick={() => clearSpotifyAuth()}>
                Reset Auth
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
