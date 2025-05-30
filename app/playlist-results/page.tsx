"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Music } from "lucide-react"
import { useRouter } from "next/navigation"
import type { PlaylistResult } from "@/lib/database"
import { PlaylistCreator } from "@/components/playlist-creator"
import { spotifyAPI } from "@/lib/spotify"

export default function PlaylistResults() {
  const [playlist, setPlaylist] = useState<PlaylistResult | null>(null)
  const router = useRouter()
  const [isSpotifyConnected, setIsSpotifyConnected] = useState(false)
  const [showPlaylistCreator, setShowPlaylistCreator] = useState(false)

  useEffect(() => {
    const playlistData = sessionStorage.getItem("playlistData")
    if (playlistData) {
      setPlaylist(JSON.parse(playlistData))
    } else {
      router.push("/")
    }
  }, [router])

  useEffect(() => {
    setIsSpotifyConnected(spotifyAPI.isAuthenticated())
  }, [])

  const createSpotifyPlaylist = () => {
    if (!playlist) return
    const query = playlist.songs.map((song) => `${song.title} ${song.artist}`).join(" OR ")
    const spotifyUrl = `https://open.spotify.com/search/${encodeURIComponent(query)}`
    window.open(spotifyUrl, "_blank")
  }

  const createAppleMusicPlaylist = () => {
    if (!playlist) return
    const query = playlist.songs.map((song) => `${song.title} ${song.artist}`).join(" ")
    const appleMusicUrl = `https://music.apple.com/search?term=${encodeURIComponent(query)}`
    window.open(appleMusicUrl, "_blank")
  }

  if (!playlist) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        {/* Header - Mobile Responsive */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Your Playlist Time Machine
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 px-4 sm:px-0">
            Billboard #1 hits from your formative years
          </p>
        </div>

        {/* Musical Timeline Card - Mobile Optimized */}
        <Card className="mb-6 sm:mb-8 bg-gradient-to-r from-purple-500 to-blue-600 text-white border-0 mx-2 sm:mx-0">
          <CardHeader className="pb-4 sm:pb-6">
            <CardTitle className="flex flex-col sm:flex-row items-center gap-2 text-white text-lg sm:text-xl">
              <Music className="h-5 w-5" />
              Your Musical Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="text-center sm:text-left">
              <p className="text-purple-100 text-xs sm:text-sm">Birth Date</p>
              <p className="font-semibold text-sm sm:text-base">
                {playlist.birthMonth} {playlist.birthYear}
              </p>
            </div>
            <div className="text-center sm:text-left">
              <p className="text-purple-100 text-xs sm:text-sm">Formative Years</p>
              <p className="font-semibold text-sm sm:text-base">{playlist.formativeYears} (Ages 12-22)</p>
            </div>
            <div className="text-center sm:text-left">
              <p className="text-purple-100 text-xs sm:text-sm">Selected Genres</p>
              <p className="font-semibold text-sm sm:text-base">{playlist.selectedGenres.join(", ")}</p>
            </div>
            <div className="text-center sm:text-left">
              <p className="text-purple-100 text-xs sm:text-sm">Total Songs</p>
              <p className="font-semibold text-sm sm:text-base">{playlist.songs.length} Billboard #1 Hits</p>
            </div>
          </CardContent>
        </Card>

        {/* Songs by Year - Mobile Responsive */}
        <Card className="mx-2 sm:mx-0">
          <CardHeader className="pb-4 sm:pb-6">
            <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2 text-lg sm:text-xl">
              <span>Your {playlist.songs.length} Billboard #1 Hits by Year</span>
            </CardTitle>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
              Chart-topping songs from your formative years ({playlist.formativeYears})
            </p>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6">
            {Object.entries(playlist.songsByYear)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([year, songs]) => {
                const age = Number(year) - playlist.birthYear
                return (
                  <div key={year} className="border rounded-lg p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                      <div className="bg-purple-600 text-white px-2 sm:px-3 py-1 rounded font-bold text-sm sm:text-base self-start">
                        {year}
                      </div>
                      <span className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
                        {songs.length} songs • Age {age}
                      </span>
                    </div>

                    {songs.length > 0 ? (
                      <div className="space-y-3 sm:space-y-0">
                        {/* Mobile: Card Layout */}
                        <div className="block sm:hidden space-y-3">
                          {songs.map((song, index) => (
                            <div key={index} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">{song.title}</p>
                                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{song.artist}</p>
                                </div>
                                <span className="text-xs text-gray-500 ml-2">#{index + 1}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs">
                                    {song.weeksAtOne} weeks
                                  </Badge>
                                  <span className="text-xs text-gray-500">{song.weekEntered}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Desktop: Table Layout */}
                        <div className="hidden sm:block overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b text-left">
                                <th className="pb-2 text-sm font-medium text-gray-600 dark:text-gray-400">#</th>
                                <th className="pb-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                                  Song & Artist
                                </th>
                                <th className="pb-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                                  Week Entered
                                </th>
                                <th className="pb-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                                  Weeks at #1
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {songs.map((song, index) => (
                                <tr key={index} className="border-b last:border-b-0">
                                  <td className="py-3 text-sm">{index + 1}</td>
                                  <td className="py-3">
                                    <div>
                                      <p className="font-medium text-sm sm:text-base">{song.title}</p>
                                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                                        {song.artist}
                                      </p>
                                    </div>
                                  </td>
                                  <td className="py-3 text-xs sm:text-sm">{song.weekEntered}</td>
                                  <td className="py-3">
                                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs">
                                      {song.weeksAtOne} weeks
                                    </Badge>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6 sm:py-8 text-gray-500">
                        <p className="text-sm sm:text-base">
                          No Billboard #1 hits found in selected genres for {year}.
                        </p>
                        <p className="text-xs sm:text-sm mt-1">Try selecting additional genres to see more songs.</p>
                      </div>
                    )}
                  </div>
                )
              })}
          </CardContent>
        </Card>

        {/* Create Playlist Button - Large and Prominent - Moved to Bottom */}
        <div className="mt-8 sm:mt-12 px-2 sm:px-0">
          <div className="max-w-2xl mx-auto">
            <Button
              onClick={() => {
                if (!isSpotifyConnected) {
                  // If not connected, show auth button first
                  setShowPlaylistCreator(true)
                } else {
                  // If connected, directly create playlist
                  setShowPlaylistCreator(true)
                }
              }}
              className="w-full bg-green-500 hover:bg-green-600 text-white py-6 sm:py-8 rounded-xl font-bold text-lg sm:text-xl touch-manipulation shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Music className="h-6 w-6 mr-3" />
              Create my playlist on Spotify
            </Button>
            <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-3">
              {isSpotifyConnected
                ? `Ready to create your playlist with ${playlist.songs.length} songs`
                : "Connect to Spotify and create your personalized time machine playlist"}
            </p>
          </div>
        </div>

        {/* Back Button - Mobile Responsive */}
        <div className="mt-6 sm:mt-8 text-center px-2 sm:px-0">
          <Button
            onClick={() => router.push("/")}
            variant="outline"
            className="px-6 sm:px-8 py-2 sm:py-3 touch-manipulation"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span className="text-sm sm:text-base">Create New Playlist</span>
          </Button>
        </div>
      </div>
      {/* Playlist Creator Modal */}
      {showPlaylistCreator && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <PlaylistCreator
            songs={playlist.songs}
            birthYear={playlist.birthYear}
            formativeYears={playlist.formativeYears}
            onClose={() => setShowPlaylistCreator(false)}
          />
        </div>
      )}
    </div>
  )
}
