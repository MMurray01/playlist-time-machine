"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Music } from "lucide-react"
import { spotifyClient } from "@/lib/spotify-client"

export function SpotifyStatusIndicator() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const checkAuth = () => {
      const authStatus = spotifyClient.isAuthenticated()
      setIsAuthenticated(authStatus)
    }

    checkAuth()
    spotifyClient.addAuthListener(checkAuth)

    return () => {
      spotifyClient.removeAuthListener(checkAuth)
    }
  }, [])

  return (
    <div className="flex items-center gap-2">
      <Music className="h-4 w-4" />
      <Badge variant={isAuthenticated ? "default" : "secondary"} className={isAuthenticated ? "bg-green-500" : ""}>
        {isAuthenticated ? "Spotify Connected" : "Spotify Disconnected"}
      </Badge>
    </div>
  )
}
