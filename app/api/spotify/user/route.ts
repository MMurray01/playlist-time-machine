import type { NextRequest } from "next/server"

/**
 * Spotify User Profile Endpoint
 * Fetches current user profile information
 */
export async function GET(request: NextRequest) {
  console.log("=== Spotify User Profile Request ===")

  try {
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
    console.log("Fetching user profile with token")

    // Make request to Spotify API
    const userResponse = await fetch("https://api.spotify.com/v1/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    })

    const responseText = await userResponse.text()

    console.log("Spotify user response:", {
      status: userResponse.status,
      statusText: userResponse.statusText,
      bodyLength: responseText.length,
    })

    // Handle rate limiting
    if (userResponse.status === 429) {
      const retryAfter = userResponse.headers.get("Retry-After") || "1"
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

    if (!userResponse.ok) {
      console.error("Spotify user request failed:", {
        status: userResponse.status,
        statusText: userResponse.statusText,
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

      return Response.json(errorData, { status: userResponse.status })
    }

    let userData
    try {
      userData = JSON.parse(responseText)
      console.log("User profile fetched successfully:", {
        id: userData.id,
        displayName: userData.display_name,
        email: userData.email,
        hasImages: userData.images?.length > 0,
      })
    } catch (parseError) {
      console.error("Failed to parse user response:", parseError)
      return Response.json(
        {
          error: "invalid_response",
          error_description: "Invalid JSON response from Spotify API",
        },
        { status: 500 },
      )
    }

    return Response.json(userData)
  } catch (error) {
    console.error("Error in user profile endpoint:", error)
    return Response.json(
      {
        error: "server_error",
        error_description: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
