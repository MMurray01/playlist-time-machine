"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bug, CheckCircle, XCircle, AlertTriangle, RefreshCw, Music } from "lucide-react"
import { spotifyService } from "@/lib/spotify-service"

interface TestResult {
  name: string
  status: "pass" | "fail" | "warning" | "pending"
  message: string
  details?: any
}

export function SpotifyDebugPanel() {
  const [isVisible, setIsVisible] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [testResults, setTestResults] = useState<TestResult[]>([])

  useEffect(() => {
    // Only show in development
    if (process.env.NODE_ENV === "development") {
      setIsVisible(true)
    }
  }, [])

  const runDiagnostics = async () => {
    setIsRunning(true)
    const results: TestResult[] = []

    try {
      // Test 1: Environment Configuration
      results.push({
        name: "Environment Configuration",
        status: "pending",
        message: "Checking environment variables...",
      })

      const hasClientId = !!process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID
      results[results.length - 1] = {
        name: "Environment Configuration",
        status: hasClientId ? "pass" : "fail",
        message: hasClientId ? "Spotify Client ID is configured" : "NEXT_PUBLIC_SPOTIFY_CLIENT_ID is missing",
        details: {
          clientId: hasClientId ? "✓ Present" : "✗ Missing",
          environment: process.env.NODE_ENV,
        },
      }

      // Test 2: API Endpoints
      results.push({
        name: "API Endpoints",
        status: "pending",
        message: "Testing API endpoints...",
      })

      try {
        const apiResponse = await fetch("/api/spotify/search?q=test&limit=1", {
          headers: {
            Authorization: "Bearer test_token",
          },
        })

        results[results.length - 1] = {
          name: "API Endpoints",
          status: apiResponse.status === 401 ? "pass" : "warning",
          message:
            apiResponse.status === 401
              ? "API endpoints are accessible (401 expected without token)"
              : `Unexpected response: ${apiResponse.status}`,
          details: {
            status: apiResponse.status,
            statusText: apiResponse.statusText,
          },
        }
      } catch (error) {
        results[results.length - 1] = {
          name: "API Endpoints",
          status: "fail",
          message: "API endpoints are not accessible",
          details: error instanceof Error ? error.message : "Unknown error",
        }
      }

      // Test 3: Authentication Status
      results.push({
        name: "Authentication Status",
        status: "pending",
        message: "Checking authentication...",
      })

      const isAuthenticated = spotifyService.isAuthenticated()
      results[results.length - 1] = {
        name: "Authentication Status",
        status: isAuthenticated ? "pass" : "warning",
        message: isAuthenticated ? "User is authenticated with Spotify" : "User is not authenticated",
        details: {
          authenticated: isAuthenticated,
          hasTokens: !!localStorage.getItem("spotify_tokens"),
        },
      }

      // Test 4: User Profile (if authenticated)
      if (isAuthenticated) {
        results.push({
          name: "User Profile",
          status: "pending",
          message: "Fetching user profile...",
        })

        try {
          const user = await spotifyService.getCurrentUser()
          results[results.length - 1] = {
            name: "User Profile",
            status: "pass",
            message: `Successfully fetched profile for ${user.display_name || user.email}`,
            details: {
              id: user.id,
              name: user.display_name,
              email: user.email,
              hasImages: user.images?.length > 0,
            },
          }

          // Test 5: Search Functionality
          results.push({
            name: "Search Functionality",
            status: "pending",
            message: "Testing search...",
          })

          try {
            const searchResults = await spotifyService.searchTracks("test", 1)
            results[results.length - 1] = {
              name: "Search Functionality",
              status: "pass",
              message: `Search successful, found ${searchResults.length} results`,
              details: {
                resultCount: searchResults.length,
                firstResult: searchResults[0]
                  ? {
                      name: searchResults[0].name,
                      artist: searchResults[0].artists[0]?.name,
                      hasPreview: !!searchResults[0].preview_url,
                    }
                  : null,
              },
            }
          } catch (searchError) {
            results[results.length - 1] = {
              name: "Search Functionality",
              status: "fail",
              message: "Search failed",
              details: searchError instanceof Error ? searchError.message : "Unknown error",
            }
          }
        } catch (userError) {
          results[results.length - 1] = {
            name: "User Profile",
            status: "fail",
            message: "Failed to fetch user profile",
            details: userError instanceof Error ? userError.message : "Unknown error",
          }
        }
      }

      // Test 6: Local Storage
      results.push({
        name: "Local Storage",
        status: "pending",
        message: "Checking local storage...",
      })

      try {
        const testKey = "spotify_test_" + Date.now()
        localStorage.setItem(testKey, "test")
        const testValue = localStorage.getItem(testKey)
        localStorage.removeItem(testKey)

        results[results.length - 1] = {
          name: "Local Storage",
          status: testValue === "test" ? "pass" : "fail",
          message: testValue === "test" ? "Local storage is working" : "Local storage is not working",
          details: {
            canWrite: testValue === "test",
            spotifyTokens: !!localStorage.getItem("spotify_tokens"),
            codeVerifier: !!localStorage.getItem("spotify_code_verifier"),
            authState: !!localStorage.getItem("spotify_auth_state"),
          },
        }
      } catch (storageError) {
        results[results.length - 1] = {
          name: "Local Storage",
          status: "fail",
          message: "Local storage error",
          details: storageError instanceof Error ? storageError.message : "Unknown error",
        }
      }

      setTestResults(results)
    } catch (error) {
      console.error("Diagnostics error:", error)
      results.push({
        name: "Diagnostics Error",
        status: "fail",
        message: "Failed to run diagnostics",
        details: error instanceof Error ? error.message : "Unknown error",
      })
      setTestResults(results)
    } finally {
      setIsRunning(false)
    }
  }

  const getStatusIcon = (status: TestResult["status"]) => {
    switch (status) {
      case "pass":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "fail":
        return <XCircle className="h-4 w-4 text-red-600" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case "pending":
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
    }
  }

  const getStatusBadge = (status: TestResult["status"]) => {
    const variants = {
      pass: "bg-green-100 text-green-800",
      fail: "bg-red-100 text-red-800",
      warning: "bg-yellow-100 text-yellow-800",
      pending: "bg-blue-100 text-blue-800",
    }

    return <Badge className={variants[status]}>{status.toUpperCase()}</Badge>
  }

  if (!isVisible) return null

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        variant="outline"
        size="sm"
        className="bg-blue-100 border-blue-300 text-blue-800 hover:bg-blue-200"
        onClick={runDiagnostics}
        disabled={isRunning}
      >
        {isRunning ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <Bug className="h-4 w-4 mr-1" />}
        Spotify Diagnostics
      </Button>

      {testResults.length > 0 && (
        <Card className="absolute bottom-full right-0 mb-2 w-96 max-h-96 overflow-auto">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Music className="h-4 w-4 text-blue-600" />
              Spotify Integration Diagnostics
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2 space-y-3">
            {testResults.map((result, index) => (
              <div key={index} className="border rounded p-2">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(result.status)}
                    <span className="text-sm font-medium">{result.name}</span>
                  </div>
                  {getStatusBadge(result.status)}
                </div>
                <p className="text-xs text-gray-600 mb-1">{result.message}</p>
                {result.details && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-gray-500 hover:text-gray-700">Details</summary>
                    <pre className="mt-1 bg-gray-50 p-1 rounded text-xs overflow-x-auto">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}

            <div className="flex gap-2 pt-2 border-t">
              <Button size="sm" variant="outline" className="text-xs flex-1" onClick={() => setTestResults([])}>
                Clear
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs flex-1"
                onClick={runDiagnostics}
                disabled={isRunning}
              >
                Re-run
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
