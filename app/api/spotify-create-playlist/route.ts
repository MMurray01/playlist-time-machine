import type { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, userId, name, description, tracks } = body

    if (!token || !userId || !name || !tracks) {
      return Response.json({ error: "Missing required parameters" }, { status: 400 })
    }

    console.log("Creating playlist:", { userId, name, trackCount: tracks.length })

    // Create playlist with Spotify
    const createResponse = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        description: description || "",
        public: false,
      }),
    })

    const createResponseText = await createResponse.text()
    console.log("Spotify create playlist response:", { status: createResponse.status })

    if (!createResponse.ok) {
      console.error("Spotify playlist creation failed:", createResponseText)
      return Response.json(
        {
          error: `Playlist creation failed: ${createResponse.status} ${createResponse.statusText}`,
          details: createResponseText,
        },
        { status: createResponse.status },
      )
    }

    let playlist
    try {
      playlist = JSON.parse(createResponseText)
    } catch (parseError) {
      console.error("Failed to parse create playlist response:", parseError)
      return Response.json({ error: "Invalid response from Spotify" }, { status: 500 })
    }

    // Add tracks to playlist
    if (tracks.length > 0) {
      // Split tracks into chunks of 100 (Spotify API limit)
      const chunks = []
      for (let i = 0; i < tracks.length; i += 100) {
        chunks.push(tracks.slice(i, i + 100))
      }

      // Add each chunk
      for (const chunk of chunks) {
        try {
          const addResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              uris: chunk,
            }),
          })

          if (!addResponse.ok) {
            const addResponseText = await addResponse.text()
            console.error("Spotify add tracks failed:", addResponseText)
            // Continue anyway, we've created the playlist
          }
        } catch (addError) {
          console.error("Error adding tracks chunk:", addError)
          // Continue with next chunk
        }
      }
    }

    return Response.json(playlist)
  } catch (error) {
    console.error("Error in spotify-create-playlist route:", error)
    return Response.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
