"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertTriangle, RefreshCw, ExternalLink, User } from "lucide-react"
import { spotifyClient, type SpotifyUser } from "@/lib/spotify-client"

export default function SpotifyProfileDebugger() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [user, setUser] = useState<SpotifyUser | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [clientId, setClientId] = useState<string | null>(null)
  const [origin, setOrigin] = useState<string>("")
  const [redirectUri, setRedirectUri] = useState<string>("")
  const [apiCallbackUri, setApiCallbackUri] = useState<string>("")

  useEffect(() => {
    // Get client ID from environment
    setClientId(process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || "20db563517e94795a0ab1ebd2bbb5607")

    // Get current origin and redirect URIs
    if (typeof window !== "undefined") {
      const currentOrigin = window.location.origin
      setOrigin(currentOrigin)
      setRedirectUri(`${currentOrigin}/callback`)
      setApiCallbackUri(`${currentOrigin}/api/spotify/callback`)
    }

    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const authenticated = spotifyClient.isAuthenticated()
      setIsAuthenticated(authenticated)

      if (authenticated) {
        try {
          const userData = await spotifyClient.getCurrentUser()
          setUser(userData)
        } catch (userError) {
          console.error("Error fetching user data:", userError)
          setError(
            `Authenticated but couldn't fetch profile: ${userError instanceof Error ? userError.message : String(userError)}`,
          )
        }
      }
    } catch (authError) {
      console.error("Error checking authentication status:", authError)
      setError(`Authentication check failed: ${authError instanceof Error ? authError.message : String(authError)}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogin = async () => {
    try {
      await spotifyClient.startAuthFlow()
    } catch (loginError) {
      console.error("Login error:", loginError)
      setError(`Login failed: ${loginError instanceof Error ? loginError.message : String(loginError)}`)
    }
  }

  const handleLogout = () => {
    spotifyClient.logout()
    setIsAuthenticated(false)
    setUser(null)
  }

  const isVercelPreview = origin.includes("vercel.app")

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Spotify Profile Debugger
          </CardTitle>
          <CardDescription>Test your Spotify integration and view profile information</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
            </div>
          ) : error ? (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className={isAuthenticated ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                    {isAuthenticated ? "Authenticated" : "Not Authenticated"}
                  </Badge>
                  {isAuthenticated && user && <span className="text-sm font-medium">as {user.display_name}</span>}
                </div>
                <Button
                  onClick={isAuthenticated ? handleLogout : handleLogin}
                  variant={isAuthenticated ? "outline" : "default"}
                >
                  {isAuthenticated ? "Disconnect" : "Connect to Spotify"}
                </Button>
              </div>

              {isAuthenticated && user && (
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-4">
                    {user.images && user.images.length > 0 && (
                      <img
                        src={user.images[0].url || "/placeholder.svg"}
                        alt={`${user.display_name}'s profile`}
                        className="w-16 h-16 rounded-full"
                      />
                    )}
                    <div>
                      <h3 className="font-bold text-lg">{user.display_name}</h3>
                      <p className="text-sm text-gray-600">{user.email}</p>
                      <p className="text-sm text-gray-600">User ID: {user.id}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="configuration">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="oauth">OAuth Flow</TabsTrigger>
          <TabsTrigger value="troubleshooting">Troubleshooting</TabsTrigger>
        </TabsList>

        <TabsContent value="configuration" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Environment Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Redirect URIs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="font-medium">Client Redirect URI:</span>{" "}
                <code className="bg-gray-100 px-2 py-1 rounded">{redirectUri}</code>
              </div>
              <div>
                <span className="font-medium">API Callback URI:</span>{" "}
                <code className="bg-gray-100 px-2 py-1 rounded">{apiCallbackUri}</code>
              </div>
              <Alert className="mt-4">
                <AlertTitle>Spotify Developer Dashboard Configuration</AlertTitle>
                <AlertDescription>
                  Make sure both URIs above are added to your Spotify Developer Dashboard.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="oauth" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">OAuth Flow Diagram</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded p-4 bg-gray-50">
                <ol className="list-decimal list-inside space-y-2">
                  <li className="text-sm">User clicks "Connect to Spotify" button</li>
                  <li className="text-sm">App generates PKCE code verifier and challenge</li>
                  <li className="text-sm">
                    App redirects to <code>/api/spotify/auth</code> with code challenge
                  </li>
                  <li className="text-sm">Server redirects to Spotify authorization page</li>
                  <li className="text-sm">User approves permissions on Spotify</li>
                  <li className="text-sm">
                    Spotify redirects to <code>/api/spotify/callback</code> with auth code
                  </li>
                  <li className="text-sm">Server exchanges auth code for tokens using PKCE verifier</li>
                  <li className="text-sm">
                    Server redirects to <code>/callback</code> with success/error
                  </li>
                  <li className="text-sm">App stores tokens and completes authentication</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Test OAuth Flow</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm">
                  Click the button below to test the OAuth flow. This will redirect you to Spotify for authorization.
                </p>
                <Button onClick={handleLogin} disabled={isAuthenticated}>
                  {isAuthenticated ? "Already Connected" : "Test OAuth Flow"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="troubleshooting" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Common Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium">Invalid Redirect URI</h4>
                  <p className="text-sm text-gray-600">
                    Ensure both <code>{redirectUri}</code> and <code>{apiCallbackUri}</code> are added to your Spotify
                    Developer Dashboard.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium">CORS Issues</h4>
                  <p className="text-sm text-gray-600">
                    Our server-side proxy should handle CORS issues. If you're seeing CORS errors, check the network tab
                    for details.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium">Token Exchange Failures</h4>
                  <p className="text-sm text-gray-600">
                    If authentication fails during token exchange, check that your Client ID and Client Secret are
                    correctly configured.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Diagnostic Tools</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button onClick={checkAuthStatus} variant="outline" className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Authentication Status
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={() => window.open("/api/spotify/test", "_blank")}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Test API Endpoint
                  </Button>

                  <Button variant="outline" onClick={() => window.open("/spotify-debug", "_blank")}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Full Debug Page
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
