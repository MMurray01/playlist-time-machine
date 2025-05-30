import type { NextRequest } from "next/server"

/**
 * Spotify Search Endpoint
 * Searches for tracks using Spotify's search API
 */
export async function GET(request: NextRequest) {
  console.log("=== Spotify Search Request ===")

  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get("q")
    const limit = searchParams.get("limit") || "10"
    const market = searchParams.get("market") || "US"

    if (!query) {
      console.error("Missing search query")
      return Response.json(
        {
          error: "invalid_request",
          error_description: "Missing search query parameter",
        },
        { status: 400 },
      )
    }

    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("Missing or invalid authorization header")
      return Response.json(
        {
          error: "unauthorized",
          error_description: "Missing or invalid authorization header",
        },
        { status: 401 },
      )
    }

    const accessToken = authHeader.replace("Bearer ", "")

    console.log(`Searching Spotify for: "${query}" (limit: ${limit}, market: ${market})`)

    // Build search URL according to Spotify API documentation
    const searchUrl = new URL("https://api.spotify.com/v1/search")
    searchUrl.searchParams.append("q", query)
    searchUrl.searchParams.append("type", "track")
    searchUrl.searchParams.append("limit", limit)
    searchUrl.searchParams.append("market", market)

    // Make request to Spotify API
    const searchResponse = await fetch(searchUrl.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    })

    const responseText = await searchResponse.text()

    console.log("Spotify search response:", {
      status: searchResponse.status,
      statusText: searchResponse.statusText,
      bodyLength: responseText.length,
    })

    // Handle rate limiting
    if (searchResponse.status === 429) {
      const retryAfter = searchResponse.headers.get("Retry-After") || "1"
      console.log(`Rate limited by Spotify. Retry after: ${retryAfter} seconds`)

      return Response.json(
        {
          error: "rate_limited",
          error_description: "Rate limited by Spotify API",
          retry_after: Number.parseInt(retryAfter),
        },
        {
          status: 429,
          headers: {
            "Retry-After": retryAfter,
          },
        },
      )
    }

    if (!searchResponse.ok) {
      console.error("Spotify search failed:", {
        status: searchResponse.status,
        statusText: searchResponse.statusText,
        body: responseText,
      })

      let errorData
      try {
        errorData = JSON.parse(responseText)
      } catch {
        errorData = {
          error: "api_error",
          error_description: "Invalid response from Spotify API",
        }
      }

      return Response.json(errorData, { status: searchResponse.status })
    }

    let searchData
    try {
      searchData = JSON.parse(responseText)
      console.log(`Search successful: found ${searchData.tracks?.items?.length || 0} tracks`)
    } catch (parseError) {
      console.error("Failed to parse search response:", parseError)
      return Response.json(
        {
          error: "invalid_response",
          error_description: "Invalid JSON response from Spotify API",
        },
        { status: 500 },
      )
    }

    return Response.json(searchData)
  } catch (error) {
    console.error("Error in search endpoint:", error)
    return Response.json(
      {
        error: "server_error",
        error_description: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
