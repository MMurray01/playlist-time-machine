import { NextRequest } from "next/server"
import { completeSpotifyLogin } from "@/lib/server/spotify-oauth"

export function GET(request: NextRequest) {
  return completeSpotifyLogin(request)
}
