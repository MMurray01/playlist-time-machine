import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, userId, name, description, tracks } = body

    if (!token || !userId || !name || !tracks) {
      return NextResponse.json({ error: "Missing required fields: token, userId, name, tracks" }, { status: 400 })
    }

    console.log(`Creating playlist "${name}" for user ${userId} with ${tracks.length} tracks`)

    // Step 1: Create the playlist
    const createPlaylistResponse = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        description,
        public: false, // Make playlist private by default
      }),
    })

    if (!createPlaylistResponse.ok) {
      const errorText = await createPlaylistResponse.text()
      console.error("Failed to create playlist:", createPlaylistResponse.status, errorText)
      return NextResponse.json(
        { error: `Failed to create playlist: ${createPlaylistResponse.status} ${errorText}` },
        { status: createPlaylistResponse.status },
      )
    }

    const playlist = await createPlaylistResponse.json()
    console.log("Playlist created:", playlist.id)

    // Step 2: Add tracks to the playlist (in batches of 100)
    if (tracks.length > 0) {
      const batchSize = 100
      for (let i = 0; i < tracks.length; i += batchSize) {
        const batch = tracks.slice(i, i + batchSize)

        const addTracksResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            uris: batch,
          }),
        })

        if (!addTracksResponse.ok) {
          const errorText = await addTracksResponse.text()
          console.error("Failed to add tracks to playlist:", addTracksResponse.status, errorText)
          // Continue with other batches even if one fails
        } else {
          console.log(`Added batch ${Math.floor(i / batchSize) + 1} of tracks to playlist`)
        }

        // Add small delay between batches to avoid rate limiting
        if (i + batchSize < tracks.length) {
          await new Promise((resolve) => setTimeout(resolve, 100))
        }
      }
    }

    return NextResponse.json({
      id: playlist.id,
      name: playlist.name,
      external_urls: playlist.external_urls,
      tracks: {
        total: tracks.length,
      },
    })
  } catch (error) {
    console.error("Error in create-playlist API:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
