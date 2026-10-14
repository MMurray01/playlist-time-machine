import { NextRequest } from "next/server"
import { beginSpotifyLogin } from "@/lib/server/spotify-oauth"

export function GET(request: NextRequest) {
  return beginSpotifyLogin(request)
}
