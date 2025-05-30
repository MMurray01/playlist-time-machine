import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")
    const token = searchParams.get("token")

    if (!query || !token) {
      return NextResponse.json({ error: "Missing query or token parameter" }, { status: 400 })
    }

    console.log(`Searching for track: "${query}"`)

    const searchResponse = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text()
      console.error("Spotify search failed:", searchResponse.status, errorText)
      return NextResponse.json(
        { error: `Spotify search failed: ${searchResponse.status}` },
        { status: searchResponse.status },
      )
    }

    const searchData = await searchResponse.json()

    return NextResponse.json({
      tracks: searchData.tracks,
    })
  } catch (error) {
    console.error("Error in search-track API:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
