"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, CheckCircle, XCircle, RefreshCw, Info } from "lucide-react"

interface DiagnosticResult {
  timestamp: string
  environment: string
  origin: string
  configuration: {
    hasClientId: boolean
    clientIdLength: number
    clientIdPreview: string
  }
  endpoints: Record<string, string>
  status: "healthy" | "warning" | "error"
  warnings?: string[]
  error?: string
}

export function SpotifyDebugInfo() {
  const [isVisible, setIsVisible] = useState(false)
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runDiagnostics = async () => {
    setLoading(true)
    setError(null)

    try {
      console.log("Running Spotify diagnostics...")

      const response = await fetch("/api/spotify/test", {
        cache: "no-cache",
      })

      if (!response.ok) {
        throw new Error(`Diagnostics failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      setDiagnostics(data)
      console.log("Diagnostics completed:", data)
    } catch (err) {
      console.error("Diagnostics error:", err)
      setError(err instanceof Error ? err.message : "Failed to run diagnostics")
    } finally {
      setLoading(false)
    }
  }

  const testAuthEndpoint = async () => {
    try {
      console.log("Testing auth endpoint directly...")

      // This should fail with a helpful error message
      const response = await fetch("/api/spotify/auth")
      const data = await response.json()

      console.log("Auth endpoint response:", data)
      alert(`Auth endpoint response: ${JSON.stringify(data, null, 2)}`)
    } catch (err) {
      console.error("Auth endpoint test error:", err)
      alert(`Auth endpoint error: ${err instanceof Error ? err.message : "Unknown error"}`)
    }
  }

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      setIsVisible(true)
    }
  }, [])

  if (!isVisible) return null

  return (
    <div className="fixed top-4 right-4 z-50">
      <Button
        variant="outline"
        size="sm"
        className="bg-blue-100 border-blue-300 text-blue-800 hover:bg-blue-200"
        onClick={() => runDiagnostics()}
        disabled={loading}
      >
        {loading ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <Info className="h-4 w-4 mr-1" />}
        Spotify Debug
      </Button>

      {(diagnostics || error) && (
        <Card className="absolute top-full right-0 mt-2 w-96 max-h-96 overflow-auto">
          <CardHeader className="py-2">
            <CardTitle className="text-sm flex items-center gap-2">
              {diagnostics?.status === "healthy" && <CheckCircle className="h-4 w-4 text-green-600" />}
              {diagnostics?.status === "warning" && <AlertTriangle className="h-4 w-4 text-yellow-600" />}
              {(diagnostics?.status === "error" || error) && <XCircle className="h-4 w-4 text-red-600" />}
              Spotify Integration Status
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2 text-xs space-y-3">
            {error && (
              <div className="bg-red-50 p-2 rounded border border-red-200">
                <p className="text-red-800 font-medium">Error</p>
                <p className="text-red-600">{error}</p>
              </div>
            )}

            {diagnostics && (
              <>
                <div className="flex items-center justify-between">
                  <span>Status:</span>
                  <Badge
                    className={
                      diagnostics.status === "healthy"
                        ? "bg-green-100 text-green-800"
                        : diagnostics.status === "warning"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                    }
                  >
                    {diagnostics.status.toUpperCase()}
                  </Badge>
                </div>

                <div>
                  <p className="font-medium mb-1">Configuration:</p>
                  <div className="bg-gray-50 p-2 rounded">
                    <p>Client ID: {diagnostics.configuration.hasClientId ? "✓ Set" : "✗ Missing"}</p>
                    <p>Environment: {diagnostics.environment}</p>
                    <p>Origin: {diagnostics.origin}</p>
                  </div>
                </div>

                {diagnostics.warnings && diagnostics.warnings.length > 0 && (
                  <div>
                    <p className="font-medium mb-1 text-yellow-800">Warnings:</p>
                    <div className="bg-yellow-50 p-2 rounded border border-yellow-200">
                      {diagnostics.warnings.map((warning, index) => (
                        <p key={index} className="text-yellow-800">
                          • {warning}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="font-medium mb-1">Available Endpoints:</p>
                  <div className="bg-gray-50 p-2 rounded max-h-32 overflow-y-auto">
                    {Object.entries(diagnostics.endpoints).map(([name, url]) => (
                      <p key={name} className="truncate">
                        <span className="font-mono">{name}:</span> {url}
                      </p>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-2 pt-2 border-t">
              <Button
                size="sm"
                variant="outline"
                className="text-xs flex-1"
                onClick={runDiagnostics}
                disabled={loading}
              >
                Refresh
              </Button>
              <Button size="sm" variant="outline" className="text-xs flex-1" onClick={testAuthEndpoint}>
                Test Auth
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs flex-1"
                onClick={() => {
                  setDiagnostics(null)
                  setError(null)
                }}
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
