import type { NextRequest } from "next/server"

/**
 * Spotify Playlist Management Endpoint
 * Creates playlists and adds tracks
 */
export async function POST(request: NextRequest) {
  console.log("=== Spotify Playlist Creation Request ===")

  try {
    const body = await request.json()
    const { userId, name, description, tracks } = body

    if (!userId || !name) {
      console.error("Missing required parameters:", {
        userId: !!userId,
        name: !!name,
      })
      return Response.json(
        {
          error: "invalid_request",
          error_description: "Missing required parameters (userId, name)",
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

    console.log("Creating playlist:", {
      userId,
      name,
      description: description || "(no description)",
      trackCount: tracks?.length || 0,
    })

    // Step 1: Create the playlist
    const createResponse = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: name,
        description: description || "",
        public: false,
      }),
    })

    const createResponseText = await createResponse.text()

    console.log("Spotify playlist creation response:", {
      status: createResponse.status,
      statusText: createResponse.statusText,
      bodyLength: createResponseText.length,
    })

    // Handle rate limiting
    if (createResponse.status === 429) {
      const retryAfter = createResponse.headers.get("Retry-After") || "1"
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

    if (!createResponse.ok) {
      console.error("Spotify playlist creation failed:", {
        status: createResponse.status,
        statusText: createResponse.statusText,
        body: createResponseText,
      })

      let errorData
      try {
        errorData = JSON.parse(createResponseText)
      } catch {
        errorData = {
          error: "api_error",
          error_description: "Invalid response from Spotify API",
        }
      }

      return Response.json(errorData, { status: createResponse.status })
    }

    let playlistData
    try {
      playlistData = JSON.parse(createResponseText)
      console.log("Playlist created successfully:", {
        id: playlistData.id,
        name: playlistData.name,
        externalUrl: playlistData.external_urls?.spotify,
      })
    } catch (parseError) {
      console.error("Failed to parse playlist creation response:", parseError)
      return Response.json(
        {
          error: "invalid_response",
          error_description: "Invalid JSON response from Spotify API",
        },
        { status: 500 },
      )
    }

    // Step 2: Add tracks to the playlist (if provided)
    if (tracks && tracks.length > 0) {
      console.log(`Adding ${tracks.length} tracks to playlist ${playlistData.id}`)

      // Split tracks into chunks of 100 (Spotify API limit)
      const chunks = []
      for (let i = 0; i < tracks.length; i += 100) {
        chunks.push(tracks.slice(i, i + 100))
      }

      let addedTracks = 0
      const errors = []

      for (const [index, chunk] of chunks.entries()) {
        try {
          console.log(`Adding chunk ${index + 1}/${chunks.length} (${chunk.length} tracks)`)

          const addResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlistData.id}/tracks`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              uris: chunk,
            }),
          })

          if (addResponse.ok) {
            addedTracks += chunk.length
            console.log(`Successfully added chunk ${index + 1}`)
          } else {
            const errorText = await addResponse.text()
            console.error(`Failed to add chunk ${index + 1}:`, {
              status: addResponse.status,
              body: errorText,
            })
            errors.push(`Chunk ${index + 1}: ${addResponse.status} ${addResponse.statusText}`)
          }

          // Add delay between chunks to avoid rate limiting
          if (index < chunks.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 100))
          }
        } catch (chunkError) {
          console.error(`Error adding chunk ${index + 1}:`, chunkError)
          errors.push(`Chunk ${index + 1}: ${chunkError instanceof Error ? chunkError.message : "Unknown error"}`)
        }
      }

      console.log(`Track addition complete: ${addedTracks}/${tracks.length} tracks added`)

      // Include track addition results in response
      playlistData.tracks_added = addedTracks
      playlistData.tracks_total = tracks.length
      if (errors.length > 0) {
        playlistData.track_errors = errors
      }
    }

    return Response.json(playlistData)
  } catch (error) {
    console.error("Error in playlist creation endpoint:", error)
    return Response.json(
      {
        error: "server_error",
        error_description: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
