import type { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get("q")
    const token = searchParams.get("token")

    if (!query || !token) {
      return Response.json({ error: "Missing required parameters" }, { status: 400 })
    }

    console.log("Searching Spotify for:", query)

    // Search tracks with Spotify
    const searchResponse = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=5&market=US`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    )

    const responseText = await searchResponse.text()
    console.log("Spotify search response:", { status: searchResponse.status, query })

    if (!searchResponse.ok) {
      console.error("Spotify search failed:", responseText)
      return Response.json(
        { error: `Search failed: ${searchResponse.status} ${searchResponse.statusText}`, details: responseText },
        { status: searchResponse.status },
      )
    }

    let searchData
    try {
      searchData = JSON.parse(responseText)
    } catch (parseError) {
      console.error("Failed to parse search response:", parseError)
      return Response.json({ error: "Invalid response from Spotify" }, { status: 500 })
    }

    return Response.json(searchData)
  } catch (error) {
    console.error("Error in spotify-search route:", error)
    return Response.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
