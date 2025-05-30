"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Music, Calendar, Smartphone, Tablet, Monitor } from "lucide-react"
import { generatePlaylistAction } from "@/actions/playlist-actions"
import { useRouter } from "next/navigation"

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

// PRD specifies exactly 10 core genres
const GENRES = ["Rock", "Pop", "Hip-Hop", "R&B", "Country", "Alternative", "Dance", "Folk", "Metal", "Soul"]

export default function PlaylistTimeMachine() {
  const [birthYear, setBirthYear] = useState("")
  const [birthMonth, setBirthMonth] = useState("January")
  const [selectedGenres, setSelectedGenres] = useState<string[]>(["Rock", "Pop", "Hip-Hop", "R&B"])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleGenreToggle = (genre: string) => {
    if (selectedGenres.includes(genre)) {
      setSelectedGenres(selectedGenres.filter((g) => g !== genre))
    } else if (selectedGenres.length < 5) {
      setSelectedGenres([...selectedGenres, genre])
    }
  }

  const handleGeneratePlaylist = async () => {
    // PRD requirement: Birth year range 1960-2010 (formative years end at 2032 max)
    if (!birthYear || Number.parseInt(birthYear) < 1960 || Number.parseInt(birthYear) > 2010) {
      setError("Please enter a valid birth year between 1960 and 2010")
      return
    }

    if (selectedGenres.length === 0) {
      setError("Please select at least one genre")
      return
    }

    setLoading(true)
    setError("")

    try {
      const result = await generatePlaylistAction(Number.parseInt(birthYear), birthMonth, selectedGenres)
      sessionStorage.setItem("playlistData", JSON.stringify(result))
      router.push("/playlist-results")
    } catch (err) {
      setError("An unexpected error occurred")
      console.error("Playlist generation error:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5f5f7] via-[#fafafa] to-[#f0f0f2] dark:from-[#1d1d1f] dark:via-[#2c2c2e] dark:to-[#1a1a1c] text-[#1d1d1f] dark:text-[#f5f5f7]">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-8 sm:py-12 md:py-16 max-w-7xl">
        {/* Hero Section - Mobile Optimized */}
        <div className="text-center mb-12 sm:mb-16 md:mb-20">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="p-2 sm:p-3 bg-[#06c] rounded-xl sm:rounded-2xl">
              <Music className="h-6 w-6 sm:h-7 md:h-8 w-6 sm:w-7 md:w-8 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-center sm:text-left">
              Playlist Time Machine
            </h1>
          </div>
          <p className="text-base sm:text-lg md:text-xl text-[#86868b] dark:text-[#a1a1a6] max-w-4xl mx-auto leading-relaxed px-4 sm:px-0">
            Discover the Billboard #1 hits that defined your formative years. Create a personalized playlist from your
            most influential period.
          </p>
        </div>

        {/* Main Input Card - Mobile Responsive */}
        <Card className="mb-8 sm:mb-12 md:mb-16 border-0 bg-white/90 dark:bg-[#2c2c2e]/90 backdrop-blur-xl shadow-xl rounded-2xl sm:rounded-3xl overflow-hidden mx-2 sm:mx-0">
          <CardHeader className="pb-6 sm:pb-8 pt-6 sm:pt-8 md:pt-10 px-4 sm:px-6 md:px-8 lg:px-10">
            <CardTitle className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 text-xl sm:text-2xl md:text-3xl font-medium text-center sm:text-left">
              <Calendar className="h-5 w-5 sm:h-6 md:h-7 w-5 sm:w-6 md:w-7 text-[#06c]" />
              Your Musical Journey
            </CardTitle>
            <CardDescription className="text-sm sm:text-base md:text-lg text-[#86868b] dark:text-[#a1a1a6] mt-2 text-left">
              We'll create a playlist based on Billboard #1 hits from your formative years
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 sm:space-y-8 md:space-y-10 px-4 sm:px-6 md:px-8 lg:px-10 pb-6 sm:pb-8 md:pb-10">
            {/* Birth Date Inputs - Responsive Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
              <div className="space-y-3">
                <Label
                  htmlFor="birthYear"
                  className="text-[#86868b] dark:text-[#a1a1a6] text-sm sm:text-base font-medium"
                >
                  Birth Year
                </Label>
                <Input
                  id="birthYear"
                  type="number"
                  placeholder="e.g., 1985"
                  value={birthYear}
                  onChange={(e) => setBirthYear(e.target.value)}
                  min="1960"
                  max="2010"
                  className="bg-[#f5f5f7] dark:bg-[#38383c] border-[#d2d2d7] dark:border-[#48484c] rounded-xl h-12 sm:h-14 text-base sm:text-lg px-3 sm:px-4 focus:ring-2 focus:ring-[#06c] focus:border-transparent transition-all"
                />
              </div>

              <div className="space-y-3">
                <Label
                  htmlFor="birthMonth"
                  className="text-[#86868b] dark:text-[#a1a1a6] text-sm sm:text-base font-medium"
                >
                  Birth Month
                </Label>
                <select
                  id="birthMonth"
                  value={birthMonth}
                  onChange={(e) => setBirthMonth(e.target.value)}
                  className="w-full h-12 sm:h-14 px-3 sm:px-4 bg-[#f5f5f7] dark:bg-[#38383c] border border-[#d2d2d7] dark:border-[#48484c] rounded-xl text-base sm:text-lg appearance-none focus:ring-2 focus:ring-[#06c] focus:border-transparent transition-all cursor-pointer"
                  style={{
                    backgroundImage:
                      "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' strokeLinecap='round' strokeLinejoin='round' strokeWidth='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E\")",
                    backgroundPosition: "right 1rem center",
                    backgroundRepeat: "no-repeat",
                    backgroundSize: "1.5em 1.5em",
                    paddingRight: "3rem",
                  }}
                >
                  {MONTHS.map((month) => (
                    <option key={month} value={month} className="bg-[#f5f5f7] dark:bg-[#38383c]">
                      {month}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Genre Selection - Mobile Optimized */}
            <div className="space-y-4 sm:space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                <Label className="text-[#86868b] dark:text-[#a1a1a6] text-sm sm:text-base font-medium">
                  Preferred Genres (we'll do our best)
                </Label>
                <span className="text-xs sm:text-sm text-[#86868b] dark:text-[#a1a1a6] bg-[#f5f5f7] dark:bg-[#38383c] px-2 sm:px-3 py-1 rounded-full self-start sm:self-auto">
                  {selectedGenres.length}/5 selected
                </span>
              </div>

              {/* Mobile-First Genre Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
                {GENRES.map((genre) => {
                  const isSelected = selectedGenres.includes(genre)
                  const isDisabled = !isSelected && selectedGenres.length >= 5

                  return (
                    <Button
                      key={genre}
                      variant={isSelected ? "default" : "outline"}
                      onClick={() => handleGenreToggle(genre)}
                      disabled={isDisabled}
                      className={`
                      h-10 sm:h-12 rounded-full transition-all duration-200 font-medium text-xs sm:text-sm
                      ${
                        isSelected
                          ? "bg-[#06c] hover:bg-[#0055b3] text-white border-[#06c] shadow-md"
                          : "bg-transparent hover:bg-[#06c]/10 text-[#1d1d1f] dark:text-[#f5f5f7] border-[#d2d2d7] dark:border-[#48484c] hover:border-[#06c]/30"
                      }
                      ${isDisabled ? "opacity-40 cursor-not-allowed" : ""}
                      touch-manipulation
                    `}
                    >
                      {genre}
                    </Button>
                  )
                })}
              </div>

              <p className="text-xs sm:text-sm text-[#86868b] dark:text-[#a1a1a6] text-center">
                Select up to 5 genres to personalize your playlist
              </p>
            </div>

            {/* Error Message - Mobile Responsive */}
            {error && (
              <div className="text-[#ff3b30] text-sm bg-[#ff3b30]/10 p-3 sm:p-4 rounded-xl border border-[#ff3b30]/20">
                {error}
              </div>
            )}

            {/* Action Button - Mobile Optimized */}
            <div className="space-y-4 pt-2 sm:pt-4">
              <Button
                onClick={handleGeneratePlaylist}
                disabled={loading}
                className="w-full bg-[#06c] hover:bg-[#0055b3] text-white font-semibold py-3 sm:py-4 px-4 sm:px-6 rounded-full transition-all duration-200 h-12 sm:h-14 text-base sm:text-lg shadow-lg hover:shadow-xl touch-manipulation"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2 sm:gap-3">
                    <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-2 border-white border-t-transparent"></div>
                    <span className="text-sm sm:text-base">Generating Your Playlist...</span>
                  </div>
                ) : (
                  "Create Time Machine Playlist"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer - Mobile Responsive */}
        <div className="text-center space-y-4 sm:space-y-6 px-4 sm:px-0">
          <p className="text-sm sm:text-base text-[#86868b] dark:text-[#a1a1a6] leading-relaxed max-w-2xl mx-auto">
            Connect your Spotify account to preview songs and create personalized playlists directly from your time
            machine results.
          </p>

          {/* Spotify Authentication */}

          {/* Device Compatibility Indicators */}
          <div className="flex items-center justify-center gap-4 sm:gap-6 mt-6 sm:mt-8">
            <div className="flex flex-col items-center gap-1 sm:gap-2">
              <Smartphone className="h-4 w-4 sm:h-5 sm:w-5 text-[#86868b] dark:text-[#a1a1a6]" />
              <span className="text-xs text-[#86868b] dark:text-[#a1a1a6]">Mobile</span>
            </div>
            <div className="flex flex-col items-center gap-1 sm:gap-2">
              <Tablet className="h-4 w-4 sm:h-5 sm:w-5 text-[#86868b] dark:text-[#a1a1a6]" />
              <span className="text-xs text-[#86868b] dark:text-[#a1a1a6]">Tablet</span>
            </div>
            <div className="flex flex-col items-center gap-1 sm:gap-2">
              <Monitor className="h-4 w-4 sm:h-5 sm:w-5 text-[#86868b] dark:text-[#a1a1a6]" />
              <span className="text-xs text-[#86868b] dark:text-[#a1a1a6]">Desktop</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
