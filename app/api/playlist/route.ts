import { playlistResponse } from "@/lib/server/playlist-api"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: Request) {
  return playlistResponse(request.url)
}
