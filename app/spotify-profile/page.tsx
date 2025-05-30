"use client"
import SpotifyProfileDebugger from "@/components/spotify-profile-debugger"

export default function SpotifyProfilePage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Spotify Profile Debug</h1>
      <p className="text-gray-600 mb-8">
        This page helps debug Spotify integration issues by displaying profile information and configuration details.
      </p>

      <div className="max-w-3xl mx-auto">
        <SpotifyProfileDebugger />

        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-800 mb-2">Spotify Developer Documentation</h3>
          <p className="text-sm text-blue-700 mb-3">
            For more information on implementing Spotify Web API in your application, refer to the official
            documentation:
          </p>
          <ul className="list-disc list-inside text-sm text-blue-700">
            <li>
              <a
                href="https://developer.spotify.com/documentation/web-api/howtos/web-app-profile"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-blue-900"
              >
                Display your Spotify profile data in a web app
              </a>
            </li>
            <li>
              <a
                href="https://developer.spotify.com/documentation/general/guides/authorization-guide"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-blue-900"
              >
                Authorization Guide
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
