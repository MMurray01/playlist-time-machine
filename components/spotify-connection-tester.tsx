"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, AlertTriangle, Play, RefreshCw, Bug } from "lucide-react"
import { spotifyClient } from "@/lib/spotify-client"

interface TestResult {
  name: string
  status: "pass" | "fail" | "warning" | "running"
  message: string
  duration?: number
  details?: any
}

export function SpotifyConnectionTester() {
  const [isVisible, setIsVisible] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [testResults, setTestResults] = useState<TestResult[]>([])

  const runComprehensiveTests = async () => {
    setIsRunning(true)
    const results: TestResult[] = []

    const addResult = (result: TestResult) => {
      results.push(result)
      setTestResults([...results])
    }

    try {
      // Test 1: Environment Configuration
      addResult({
        name: "Environment Configuration",
        status: "running",
        message: "Checking environment setup...",
      })

      const startTime = Date.now()
      const hasClientId = !!process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID
      const duration = Date.now() - startTime

      results[results.length - 1] = {
        name: "Environment Configuration",
        status: hasClientId ? "pass" : "fail",
        message: hasClientId ? "Spotify Client ID configured" : "NEXT_PUBLIC_SPOTIFY_CLIENT_ID missing",
        duration,
        details: {
          clientId: hasClientId ? "✓ Present" : "✗ Missing",
          environment: process.env.NODE_ENV,
          origin: typeof window !== "undefined" ? window.location.origin : "unknown",
        },
      }
      setTestResults([...results])

      // Test 2: Server-Side API Endpoints
      addResult({
        name: "Server-Side API Endpoints",
        status: "running",
        message: "Testing API proxy endpoints...",
      })

      const apiStartTime = Date.now()
      try {
        // Test the search endpoint without auth (should return 401)
        const searchResponse = await fetch("/api/spotify/search?q=test", {
          headers: { Authorization: "Bearer invalid_token" },
        })

        const apiDuration = Date.now() - apiStartTime
        const expectedStatus = searchResponse.status === 401

        results[results.length - 1] = {
          name: "Server-Side API Endpoints",
          status: expectedStatus ? "pass" : "warning",
          message: expectedStatus
            ? "API endpoints accessible and properly secured"
            : `Unexpected response: ${searchResponse.status}`,
          duration: apiDuration,
          details: {
            searchEndpoint: {
              status: searchResponse.status,
              statusText: searchResponse.statusText,
              expected: 401,
              actual: searchResponse.status,
            },
          },
        }
      } catch (apiError) {
        results[results.length - 1] = {
          name: "Server-Side API Endpoints",
          status: "fail",
          message: "API endpoints not accessible",
          duration: Date.now() - apiStartTime,
          details: { error: apiError instanceof Error ? apiError.message : "Unknown error" },
        }
      }
      setTestResults([...results])

      // Test 3: Authentication Status
      addResult({
        name: "Authentication Status",
        status: "running",
        message: "Checking Spotify authentication...",
      })

      const authStartTime = Date.now()
      const isAuthenticated = spotifyClient.isAuthenticated()
      const authDuration = Date.now() - authStartTime

      results[results.length - 1] = {
        name: "Authentication Status",
        status: isAuthenticated ? "pass" : "warning",
        message: isAuthenticated ? "User authenticated with Spotify" : "User not authenticated",
        duration: authDuration,
        details: {
          authenticated: isAuthenticated,
          hasStoredTokens: !!localStorage.getItem("spotify_tokens_v2"),
          storageKeys: Object.keys(localStorage).filter((key) => key.includes("spotify")),
        },
      }
      setTestResults([...results])

      // Test 4: User Profile (if authenticated)
      if (isAuthenticated) {
        addResult({
          name: "User Profile Retrieval",
          status: "running",
          message: "Fetching user profile...",
        })

        const userStartTime = Date.now()
        try {
          const user = await spotifyClient.getCurrentUser()
          const userDuration = Date.now() - userStartTime

          results[results.length - 1] = {
            name: "User Profile Retrieval",
            status: "pass",
            message: `Profile retrieved: ${user.display_name || user.email}`,
            duration: userDuration,
            details: {
              id: user.id,
              displayName: user.display_name,
              email: user.email,
              hasImages: user.images?.length > 0,
              imageCount: user.images?.length || 0,
            },
          }

          // Test 5: Search Functionality
          addResult({
            name: "Search Functionality",
            status: "running",
            message: "Testing track search...",
          })

          const searchStartTime = Date.now()
          try {
            const searchResults = await spotifyClient.searchTracks("The Beatles", 3)
            const searchDuration = Date.now() - searchStartTime

            results[results.length - 1] = {
              name: "Search Functionality",
              status: searchResults.length > 0 ? "pass" : "warning",
              message: `Search returned ${searchResults.length} results`,
              duration: searchDuration,
              details: {
                query: "The Beatles",
                resultCount: searchResults.length,
                results: searchResults.slice(0, 2).map((track) => ({
                  name: track.name,
                  artist: track.artists[0]?.name,
                  hasPreview: !!track.preview_url,
                  uri: track.uri,
                })),
              },
            }
          } catch (searchError) {
            results[results.length - 1] = {
              name: "Search Functionality",
              status: "fail",
              message: "Search failed",
              duration: Date.now() - searchStartTime,
              details: { error: searchError instanceof Error ? searchError.message : "Unknown error" },
            }
          }
        } catch (userError) {
          results[results.length - 1] = {
            name: "User Profile Retrieval",
            status: "fail",
            message: "Failed to fetch user profile",
            duration: Date.now() - userStartTime,
            details: { error: userError instanceof Error ? userError.message : "Unknown error" },
          }
        }
      }

      // Test 6: Local Storage Functionality
      addResult({
        name: "Local Storage",
        status: "running",
        message: "Testing local storage...",
      })

      const storageStartTime = Date.now()
      try {
        const testKey = `spotify_test_${Date.now()}`
        const testValue = "test_value"

        localStorage.setItem(testKey, testValue)
        const retrievedValue = localStorage.getItem(testKey)
        localStorage.removeItem(testKey)

        const storageDuration = Date.now() - storageStartTime
        const storageWorking = retrievedValue === testValue

        results[results.length - 1] = {
          name: "Local Storage",
          status: storageWorking ? "pass" : "fail",
          message: storageWorking ? "Local storage working correctly" : "Local storage not functioning",
          duration: storageDuration,
          details: {
            canWrite: storageWorking,
            testKey,
            testValue,
            retrievedValue,
            spotifyKeys: Object.keys(localStorage).filter((key) => key.includes("spotify")),
          },
        }
      } catch (storageError) {
        results[results.length - 1] = {
          name: "Local Storage",
          status: "fail",
          message: "Local storage error",
          duration: Date.now() - storageStartTime,
          details: { error: storageError instanceof Error ? storageError.message : "Unknown error" },
        }
      }

      setTestResults([...results])
    } catch (error) {
      console.error("Test suite error:", error)
      addResult({
        name: "Test Suite Error",
        status: "fail",
        message: "Failed to complete test suite",
        details: { error: error instanceof Error ? error.message : "Unknown error" },
      })
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
      case "running":
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
    }
  }

  const getStatusBadge = (status: TestResult["status"]) => {
    const variants = {
      pass: "bg-green-100 text-green-800 border-green-200",
      fail: "bg-red-100 text-red-800 border-red-200",
      warning: "bg-yellow-100 text-yellow-800 border-yellow-200",
      running: "bg-blue-100 text-blue-800 border-blue-200",
    }

    return (
      <Badge variant="outline" className={variants[status]}>
        {status.toUpperCase()}
      </Badge>
    )
  }

  const getOverallStatus = () => {
    if (testResults.length === 0) return "No tests run"

    const passCount = testResults.filter((r) => r.status === "pass").length
    const failCount = testResults.filter((r) => r.status === "fail").length
    const warningCount = testResults.filter((r) => r.status === "warning").length

    if (failCount > 0) return `${failCount} failed, ${passCount} passed`
    if (warningCount > 0) return `${passCount} passed, ${warningCount} warnings`
    return `All ${passCount} tests passed`
  }

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          className="bg-blue-100 border-blue-300 text-blue-800 hover:bg-blue-200"
          onClick={() => setIsVisible(true)}
        >
          <Bug className="h-4 w-4 mr-1" />
          Spotify Tests
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <Card className="w-96 max-h-96 overflow-hidden">
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Play className="h-4 w-4 text-blue-600" />
              Spotify Connection Tests
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setIsVisible(false)} className="h-6 w-6 p-0">
              ×
            </Button>
          </div>
          {testResults.length > 0 && <p className="text-xs text-gray-600">{getOverallStatus()}</p>}
        </CardHeader>
        <CardContent className="py-2 space-y-3 max-h-64 overflow-y-auto">
          {testResults.map((result, index) => (
            <div key={index} className="border rounded p-2 text-sm">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  {getStatusIcon(result.status)}
                  <span className="font-medium text-xs">{result.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {result.duration && <span className="text-xs text-gray-500">{result.duration}ms</span>}
                  {getStatusBadge(result.status)}
                </div>
              </div>
              <p className="text-xs text-gray-600 mb-1">{result.message}</p>
              {result.details && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-gray-500 hover:text-gray-700">Details</summary>
                  <pre className="mt-1 bg-gray-50 p-1 rounded text-xs overflow-x-auto font-mono">
                    {JSON.stringify(result.details, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))}

          <div className="flex gap-2 pt-2 border-t">
            <Button
              size="sm"
              variant="outline"
              className="text-xs flex-1"
              onClick={runComprehensiveTests}
              disabled={isRunning}
            >
              {isRunning ? "Running..." : "Run Tests"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs flex-1"
              onClick={() => setTestResults([])}
              disabled={isRunning}
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
