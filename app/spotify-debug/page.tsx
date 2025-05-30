"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, ExternalLink } from "lucide-react"

interface TestResult {
  name: string
  url: string
  status: "loading" | "success" | "error" | "warning"
  response?: any
  error?: string
  statusCode?: number
}

export default function SpotifyDebugPage() {
  const [tests, setTests] = useState<TestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [clientId, setClientId] = useState<string | null>(null)
  const [origin, setOrigin] = useState<string>("")

  const endpoints = [
    { name: "Status Check", url: "/api/spotify/status" },
    { name: "Diagnostics", url: "/api/spotify/test" },
    { name: "Auth Endpoint", url: "/api/spotify/auth" },
  ]

  useEffect(() => {
    // Get client ID from environment
    setClientId(process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || "20db563517e94795a0ab1ebd2bbb5607")

    // Get current origin
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin)
    }
  }, [])

  const runTests = async () => {
    setIsRunning(true)
    const results: TestResult[] = []

    for (const endpoint of endpoints) {
      const testResult: TestResult = {
        name: endpoint.name,
        url: endpoint.url,
        status: "loading",
      }

      results.push(testResult)
      setTests([...results])

      try {
        console.log(`Testing ${endpoint.name}: ${endpoint.url}`)

        const response = await fetch(endpoint.url, {
          cache: "no-cache",
          headers: {
            // Add a header to identify this as a test request
            "X-Test-Request": "true",
          },
        })

        let data
        const contentType = response.headers.get("content-type") || ""

        if (contentType.includes("application/json")) {
          data = await response.json()
        } else if (contentType.includes("text/html")) {
          const text = await response.text()
          data = {
            _note: "HTML response received (expected for direct browser access)",
            _preview: text.substring(0, 100) + "...",
          }
        } else {
          data = { _note: "Non-JSON response received" }
        }

        testResult.statusCode = response.status
        testResult.response = data

        if (response.ok) {
          testResult.status = "success"
        } else if (response.status === 400 && endpoint.url.includes("/auth")) {
          // Auth endpoint should return 400 when accessed directly without params
          testResult.status = "success"
          testResult.response = {
            ...data,
            _note: "This is the expected response when accessing the auth endpoint directly",
          }
        } else {
          testResult.status = "error"
          testResult.error = `HTTP ${response.status}: ${response.statusText}`
        }
      } catch (error) {
        console.error(`Test failed for ${endpoint.name}:`, error)
        testResult.status = "error"
        testResult.error = error instanceof Error ? error.message : "Unknown error"
      }

      setTests([...results])
    }

    setIsRunning(false)
  }

  useEffect(() => {
    runTests()
  }, [])

  const getStatusIcon = (status: TestResult["status"]) => {
    switch (status) {
      case "loading":
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-600" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
    }
  }

  const getStatusBadge = (status: TestResult["status"]) => {
    const variants = {
      loading: "bg-blue-100 text-blue-800",
      success: "bg-green-100 text-green-800",
      error: "bg-red-100 text-red-800",
      warning: "bg-yellow-100 text-yellow-800",
    }

    return <Badge className={variants[status]}>{status.toUpperCase()}</Badge>
  }

  const isVercelPreview = origin.includes("vercel.app")

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Spotify Integration Debug</h1>
          <p className="text-gray-600">This page tests the Spotify API endpoints to help diagnose any issues.</p>
        </div>

        <div className="mb-6">
          <Button onClick={runTests} disabled={isRunning} className="mr-4">
            {isRunning ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Running Tests...
              </>
            ) : (
              "Run Tests"
            )}
          </Button>

          <Button variant="outline" onClick={() => (window.location.href = "/")}>
            Back to App
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle>Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <span className="font-medium">Client ID:</span>{" "}
                {clientId ? (
                  <code className="bg-gray-100 px-2 py-1 rounded">
                    {clientId.substring(0, 4)}...{clientId.substring(clientId.length - 4)}
                  </code>
                ) : (
                  <span className="text-red-500">Not configured</span>
                )}
              </div>
              <div>
                <span className="font-medium">Environment:</span>{" "}
                <code className="bg-gray-100 px-2 py-1 rounded">{process.env.NODE_ENV || "development"}</code>
              </div>
              <div>
                <span className="font-medium">Origin:</span>{" "}
                <code className="bg-gray-100 px-2 py-1 rounded">{origin}</code>
              </div>
              <div>
                <span className="font-medium">Deployment:</span>{" "}
                <Badge className={isVercelPreview ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"}>
                  {isVercelPreview ? "Vercel Preview" : "Production"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {tests.map((test, index) => (
            <Card key={index}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {getStatusIcon(test.status)}
                    {test.name}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {test.statusCode && <Badge variant="outline">{test.statusCode}</Badge>}
                    {getStatusBadge(test.status)}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>{test.url}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(test.url, "_blank")}
                    className="h-6 w-6 p-0"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>

              {(test.response || test.error) && (
                <CardContent>
                  {test.error && (
                    <div className="bg-red-50 border border-red-200 rounded p-3 mb-3">
                      <p className="text-red-800 font-medium">Error:</p>
                      <p className="text-red-600 text-sm">{test.error}</p>
                    </div>
                  )}

                  {test.response && (
                    <div>
                      <p className="font-medium mb-2">Response:</p>
                      <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
                        {JSON.stringify(test.response, null, 2)}
                      </pre>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        {tests.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">Click "Run Tests" to start testing the endpoints.</p>
            </CardContent>
          </Card>
        )}

        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-800 mb-2">Vercel Preview Configuration</h3>
          <p className="text-sm text-blue-700 mb-3">
            You've correctly added these URIs to your Spotify Developer Dashboard:
          </p>
          <div className="bg-white p-3 rounded border border-blue-100 font-mono text-xs">
            <div>https://playlisttimemachine.vercel.app/api/spotify/callback</div>
            <div>https://playlisttimemachine.vercel.app/callback</div>
          </div>

          <div className="mt-4">
            <p className="text-sm text-blue-700 mb-2">
              These URIs will allow testing on the Vercel preview deployment before moving to production.
            </p>
            <p className="text-sm text-blue-700">
              When you're ready to go live with playlisttimemachine.com, add these additional URIs:
            </p>
            <div className="bg-white p-3 mt-2 rounded border border-blue-100 font-mono text-xs">
              <div>https://playlisttimemachine.com/api/spotify/callback</div>
              <div>https://playlisttimemachine.com/callback</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
