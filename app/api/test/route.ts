export async function GET() {
  return Response.json({
    success: true,
    message: "API is working",
    timestamp: new Date().toISOString(),
    env: {
      hasSpotifyClientId: !!process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID,
      nodeEnv: process.env.NODE_ENV,
    },
  })
}
