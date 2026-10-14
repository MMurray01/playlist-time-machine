import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { isShareId } from "@/lib/playlist/ids"

const MISSING = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Playlist not found · Playlist Time Machine</title>
<meta name="robots" content="noindex"/>
<style>
  body { margin: 0; background: #f6f6f7; color: #111113; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
  main { width: min(40rem, calc(100% - 2.5rem)); margin: 4rem auto; }
  a { color: #1d4ed8; }
  h1 { font-size: clamp(2.15rem, 5vw, 3.15rem); letter-spacing: -0.038em; line-height: 1.05; }
  p { color: #3f3f46; font-size: 1.125rem; line-height: 1.5; }
</style>
</head>
<body>
<main>
<p><a href="/">Playlist Time Machine</a></p>
<h1>This playlist link is not here.</h1>
<p>The share link may be incomplete, or it may have been removed.</p>
<p><a href="/">Build a class playlist</a></p>
</main>
</body>
</html>`

function missingPlaylist() {
  return new NextResponse(MISSING, {
    status: 404,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  })
}

export async function middleware(request: NextRequest) {
  const id = request.nextUrl.pathname.slice(3)
  if (!isShareId(id)) return missingPlaylist()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) return NextResponse.next()

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/shared_playlists?id=eq.${encodeURIComponent(id)}&select=id`,
      {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
      },
    )
    if (!response.ok) return NextResponse.next()
    const rows = (await response.json()) as unknown
    if (!Array.isArray(rows) || rows.length === 0) return missingPlaylist()
  } catch {
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/p/:id"],
}
