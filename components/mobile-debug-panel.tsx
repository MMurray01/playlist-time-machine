"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Smartphone, Wifi, RefreshCw } from "lucide-react"
import { spotifyClient } from "@/lib/spotify-client"

export function MobileDebugPanel() {
  const [debugInfo, setDebugInfo] = useState({
    userAgent: "",
    isMobile: false,
    isIOS: false,
    isSafari: false,
    viewport: { width: 0, height: 0 },
    localStorage: false,
    sessionStorage: false,
    crypto: false,
    popupSupport: false,
    spotifyAuth: false,
    tokens: null as any,
    urlParams: {} as Record<string, string>,
    timestamp: new Date().toISOString(),
  })

  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs((prev) => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)])
  }

  useEffect(() => {
    const updateDebugInfo = () => {
      const userAgent = navigator.userAgent
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
      const isIOS = /iPad|iPhone|iPod/.test(userAgent)
      const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent)

      // Get URL parameters
      const urlParams: Record<string, string> = {}
      const searchParams = new URLSearchParams(window.location.search)
      searchParams.forEach((value, key) => {
        urlParams[key] = value
      })

      // Test popup support
      let popupSupport = false
      try {
        const testPopup = window.open("", "_blank", "width=1,height=1")
        if (testPopup) {
          popupSupport = true
          testPopup.close()
        }
      } catch (e) {
        popupSupport = false
      }

      // Check stored tokens
      let tokens = null
      try {
        const storedTokens = localStorage.getItem("spotify_tokens_v7")
        if (storedTokens) {
          tokens = JSON.parse(storedTokens)
        }
      } catch (e) {
        // ignore
      }

      setDebugInfo({
        userAgent,
        isMobile,
        isIOS,
        isSafari,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        localStorage: typeof Storage !== "undefined",
        sessionStorage: typeof sessionStorage !== "undefined",
        crypto: typeof window.crypto !== "undefined" && typeof window.crypto.getRandomValues !== "undefined",
        popupSupport,
        spotifyAuth: spotifyClient.isAuthenticated(),
        tokens,
        urlParams,
        timestamp: new Date().toISOString(),
      })
    }

    updateDebugInfo()

    // Listen for auth changes
    const handleAuthChange = () => {
      addLog("Spotify auth state changed")
      updateDebugInfo()
    }

    window.addEventListener("spotify-auth-changed", handleAuthChange)
    window.addEventListener("resize", updateDebugInfo)

    // Listen for messages
    const handleMessage = (event: MessageEvent) => {
      addLog(`Received message: ${JSON.stringify(event.data)}`)
      updateDebugInfo()
    }

    window.addEventListener("message", handleMessage)

    return () => {
      window.removeEventListener("spotify-auth-changed", handleAuthChange)
      window.removeEventListener("resize", updateDebugInfo)
      window.removeEventListener("message", handleMessage)
    }
  }, [])

  const testSpotifyAuth = async () => {
    addLog("Starting Spotify authentication test...")
    try {
      await spotifyClient.startAuthFlow()
      addLog("Auth flow started successfully")
    } catch (error) {
      addLog(`Auth flow failed: ${error}`)
    }
  }

  const clearStorage = () => {
    localStorage.clear()
    sessionStorage.clear()
    addLog("Cleared all storage")
    window.location.reload()
  }

  const testLocalStorage = () => {
    try {
      localStorage.setItem("test", "value")
      const value = localStorage.getItem("test")
      localStorage.removeItem("test")
      addLog(`LocalStorage test: ${value === "value" ? "PASS" : "FAIL"}`)
    } catch (error) {
      addLog(`LocalStorage test: FAIL - ${error}`)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Mobile Debug Panel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Device Info */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <strong>Mobile:</strong>
              <Badge variant={debugInfo.isMobile ? "default" : "secondary"} className="ml-2">
                {debugInfo.isMobile ? "Yes" : "No"}
              </Badge>
            </div>
            <div>
              <strong>iOS:</strong>
              <Badge variant={debugInfo.isIOS ? "default" : "secondary"} className="ml-2">
                {debugInfo.isIOS ? "Yes" : "No"}
              </Badge>
            </div>
            <div>
              <strong>Safari:</strong>
              <Badge variant={debugInfo.isSafari ? "default" : "secondary"} className="ml-2">
                {debugInfo.isSafari ? "Yes" : "No"}
              </Badge>
            </div>
            <div>
              <strong>Popup Support:</strong>
              <Badge variant={debugInfo.popupSupport ? "default" : "destructive"} className="ml-2">
                {debugInfo.popupSupport ? "Yes" : "No"}
              </Badge>
            </div>
          </div>

          {/* Viewport */}
          <div className="text-sm">
            <strong>Viewport:</strong> {debugInfo.viewport.width} × {debugInfo.viewport.height}
          </div>

          {/* Storage Support */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <strong>LocalStorage:</strong>
              <Badge variant={debugInfo.localStorage ? "default" : "destructive"} className="ml-2">
                {debugInfo.localStorage ? "Yes" : "No"}
              </Badge>
            </div>
            <div>
              <strong>SessionStorage:</strong>
              <Badge variant={debugInfo.sessionStorage ? "default" : "destructive"} className="ml-2">
                {debugInfo.sessionStorage ? "Yes" : "No"}
              </Badge>
            </div>
          </div>

          {/* Crypto Support */}
          <div className="text-sm">
            <strong>Crypto API:</strong>
            <Badge variant={debugInfo.crypto ? "default" : "destructive"} className="ml-2">
              {debugInfo.crypto ? "Available" : "Not Available"}
            </Badge>
          </div>

          {/* Spotify Auth Status */}
          <div className="text-sm">
            <strong>Spotify Auth:</strong>
            <Badge variant={debugInfo.spotifyAuth ? "default" : "secondary"} className="ml-2">
              {debugInfo.spotifyAuth ? "Authenticated" : "Not Authenticated"}
            </Badge>
          </div>

          {/* URL Parameters */}
          {Object.keys(debugInfo.urlParams).length > 0 && (
            <div className="text-sm">
              <strong>URL Parameters:</strong>
              <div className="mt-1 p-2 bg-gray-100 rounded text-xs font-mono">
                {JSON.stringify(debugInfo.urlParams, null, 2)}
              </div>
            </div>
          )}

          {/* Stored Tokens */}
          {debugInfo.tokens && (
            <div className="text-sm">
              <strong>Stored Tokens:</strong>
              <div className="mt-1 p-2 bg-gray-100 rounded text-xs font-mono">
                <div>Access Token: {debugInfo.tokens.accessToken ? "Present" : "Missing"}</div>
                <div>Refresh Token: {debugInfo.tokens.refreshToken ? "Present" : "Missing"}</div>
                <div>Expires At: {new Date(debugInfo.tokens.expiresAt).toLocaleString()}</div>
                <div>Is Expired: {Date.now() > debugInfo.tokens.expiresAt ? "Yes" : "No"}</div>
              </div>
            </div>
          )}

          {/* User Agent */}
          <div className="text-sm">
            <strong>User Agent:</strong>
            <div className="mt-1 p-2 bg-gray-100 rounded text-xs font-mono break-all">{debugInfo.userAgent}</div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={testSpotifyAuth} size="sm">
              Test Spotify Auth
            </Button>
            <Button onClick={testLocalStorage} size="sm" variant="outline">
              Test Storage
            </Button>
            <Button onClick={clearStorage} size="sm" variant="destructive">
              Clear Storage
            </Button>
            <Button onClick={() => window.location.reload()} size="sm" variant="outline">
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5" />
            Debug Logs
            <Button onClick={() => setLogs([])} size="sm" variant="outline" className="ml-auto">
              Clear
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-500 text-sm">No logs yet...</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="text-xs font-mono p-2 bg-gray-50 rounded">
                  {log}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
