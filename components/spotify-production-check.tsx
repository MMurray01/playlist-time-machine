"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, AlertTriangle, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"

export function SpotifyProductionCheck() {
  const [checks, setChecks] = useState({
    clientId: false,
    domain: false,
    redirects: false,
    https: false,
  })

  useEffect(() => {
    // Check if we're on the production domain
    const isProdDomain = window.location.hostname === "playlisttimemachine.com"

    // Check if client ID is set
    const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || "20db563517e94795a0ab1ebd2bbb5607"
    const hasClientId = !!clientId && clientId.length > 10

    // Check if we're using HTTPS
    const isHttps = window.location.protocol === "https:"

    // Check if redirects are likely configured
    // This is just a guess - we can't actually verify without trying the flow
    const redirectsLikelyConfigured = isProdDomain || window.location.hostname === "localhost"

    setChecks({
      clientId: hasClientId,
      domain: isProdDomain,
      redirects: redirectsLikelyConfigured,
      https: isHttps || window.location.hostname === "localhost",
    })
  }, [])

  const allChecksPass = Object.values(checks).every(Boolean)

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Spotify Production Configuration</CardTitle>
        <CardDescription>Checking your Spotify integration for production readiness</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-2">
              {checks.clientId ? (
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
              )}
              <div>
                <p className="font-medium">Spotify Client ID</p>
                <p className="text-sm text-gray-500">
                  {checks.clientId ? "Client ID is configured" : "Client ID may not be set correctly"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              {checks.domain ? (
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
              )}
              <div>
                <p className="font-medium">Production Domain</p>
                <p className="text-sm text-gray-500">
                  {checks.domain ? "Running on playlisttimemachine.com" : "Not on production domain yet"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              {checks.redirects ? (
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
              )}
              <div>
                <p className="font-medium">Redirect URIs</p>
                <p className="text-sm text-gray-500">
                  {checks.redirects ? "Redirect URIs likely configured" : "Redirect URIs may need configuration"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              {checks.https ? (
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
              )}
              <div>
                <p className="font-medium">HTTPS Protocol</p>
                <p className="text-sm text-gray-500">
                  {checks.https ? "Using secure HTTPS connection" : "Not using HTTPS - required for production"}
                </p>
              </div>
            </div>
          </div>

          {!allChecksPass && (
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Configuration Warning</AlertTitle>
              <AlertDescription>
                Some Spotify configuration checks failed. Please ensure you've added these redirect URIs to your Spotify
                Developer Dashboard:
                <ul className="list-disc pl-5 mt-2 text-sm">
                  <li>https://playlisttimemachine.com/api/spotify/callback</li>
                  <li>https://playlisttimemachine.com/callback</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end mt-4">
            <Button variant="outline" size="sm" asChild>
              <a
                href="https://developer.spotify.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1"
              >
                Spotify Dashboard <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
