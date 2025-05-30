"use client"

import { SpotifyIntegrationTest } from "@/components/spotify-integration-test"

export default function SpotifyTestPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="container mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Spotify Integration Test</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Comprehensive testing suite for Spotify authentication and API functionality
          </p>
        </div>

        <SpotifyIntegrationTest />

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            This test suite verifies authentication persistence, API functionality, and playlist creation capabilities.
          </p>
        </div>
      </div>
    </div>
  )
}
