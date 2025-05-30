"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, CheckCircle, Copy, ExternalLink } from "lucide-react"
import { validateSpotifyRedirectURIs, type RedirectURIValidation } from "@/lib/spotify-redirect-validator"

export function SpotifyRedirectDebugger() {
  const [validation, setValidation] = useState<RedirectURIValidation | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    setValidation(validateSpotifyRedirectURIs())
  }, [])

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(label)
      setTimeout(() => setCopied(null), 2000)
    } catch (error) {
      console.error("Failed to copy:", error)
    }
  }

  if (!validation) {
    return <div>Loading redirect URI validation...</div>
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {validation.isValid ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-500" />
          )}
          Spotify Redirect URI Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Configuration */}
        <div>
          <h3 className="font-semibold mb-3">Current Configuration</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
              <span className="text-sm">Current Origin:</span>
              <div className="flex items-center gap-2">
                <code className="text-sm bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                  {validation.currentOrigin}
                </code>
                <Button size="sm" variant="ghost" onClick={() => copyToClipboard(validation.currentOrigin, "origin")}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Required Redirect URIs */}
        <div>
          <h3 className="font-semibold mb-3">Required Redirect URIs for Spotify App</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Add these exact URIs to your Spotify app settings:
          </p>
          <div className="space-y-2">
            {[validation.expectedCallbackURI, validation.expectedClientURI].map((uri, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800"
              >
                <code className="text-sm flex-1">{uri}</code>
                <Button size="sm" variant="ghost" onClick={() => copyToClipboard(uri, `uri-${index}`)} className="ml-2">
                  {copied === `uri-${index}` ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Development URIs */}
        <div>
          <h3 className="font-semibold mb-3">Development Redirect URIs</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Also add these for local development:</p>
          <div className="space-y-2">
            {["http://localhost:3000/api/spotify/callback", "http://localhost:3000/callback"].map((uri, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                <code className="text-sm flex-1">{uri}</code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(uri, `dev-uri-${index}`)}
                  className="ml-2"
                >
                  {copied === `dev-uri-${index}` ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Errors */}
        {validation.errors.length > 0 && (
          <div>
            <h3 className="font-semibold mb-3 text-red-600 dark:text-red-400">Issues Found</h3>
            <div className="space-y-2">
              {validation.errors.map((error, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800"
                >
                  <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            onClick={() => window.open("https://developer.spotify.com/dashboard", "_blank")}
            className="flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Open Spotify Dashboard
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const uris = [validation.expectedCallbackURI, validation.expectedClientURI].join("\n")
              copyToClipboard(uris, "all-uris")
            }}
          >
            {copied === "all-uris" ? (
              <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
            ) : (
              <Copy className="h-4 w-4 mr-2" />
            )}
            Copy All URIs
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
