# Deploy on Vercel

The app is a Next.js server app. Vercel detects it from `package.json` and `pnpm-lock.yaml`. Do not add `vercel.json`, and do not set an output directory or a static export.

`pnpm build` (`next build`) is the production build. Playlists are saved to Apple Music only.

## Environment

Set these in the Vercel project under **Settings → Environment Variables** for Production. Add the same values to Preview if that deployment should read the chart and save to Apple Music.

The site builds a playlist with Supabase alone. Saving and album art need the three Apple Music variables. No Spotify variables are used.

| Name | Required | Value |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL, `https://<project-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon (public) key |
| `APPLE_TEAM_ID` | Yes, to save | Apple Developer team id |
| `APPLE_KEY_ID` | Yes, to save | MusicKit key id (`kid` on the developer token) |
| `APPLE_PRIVATE_KEY` | Yes, to save | MusicKit `.p8` file. Paste the PEM. Real line breaks or the two characters `\n` both work. |

| Name | When to set it |
| --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | Creating a share link. Server only. Never prefix it with `NEXT_PUBLIC_`. Without it, the playlist stays on the page and Share explains that the server key is missing. |
| `UPSTASH_REDIS_REST_URL` | Shared counter for new share links. Server only. Pair it with `UPSTASH_REDIS_REST_TOKEN`. `KV_REST_API_URL` is used when the Upstash URL is unset. |
| `UPSTASH_REDIS_REST_TOKEN` | Token for the Redis REST URL above. Server only. `KV_REST_API_TOKEN` is the fallback pair. |
| `NEXT_PUBLIC_SITE_URL` | Optional absolute origin for a share link when the request has no host. Vercel sends `x-forwarded-host`, so leave this empty unless you want to force one origin. |

`createSharedPlaylist` allows 10 new share links per IP per hour. `POST /api/share` and the website share action both call it, so they share one gate. Connect Upstash Redis from the Vercel Marketplace and set the REST URL and token so every server instance uses the same count. The API answers the 11th create with HTTP 429 and a `Retry-After` header. The website shows the same sentence. Until those variables are set, the count lives in the server process and does not hold across every Vercel instance.

`NEXT_PUBLIC_*` values are inlined at build time. Redeploy after changing them.

Apply `supabase/migrations/20261014020000_shared_playlist_title.sql` yourself if a database does not have `shared_playlists.title` yet. Deploy does not change the database. If `title` is missing, share pages fall back to “Class of {year}”.

There is no Apple song id or ISRC on `number_one_hits` today, so this deploy does not add one. Matching uses the song title and artist, then a shorter title and the main artist, then the title alone. If a row includes `apple_song_id` or `isrc`, that value is used only when the recording still agrees with the chart title and artist. When the Apple Music catalog cannot be searched, the iTunes Search API still fills in covers and 30-second previews. No migration was added.

## Graduation year, covers, and previews

The page asks for one thing: the year you graduated high school. The server and the year field both reject a year after the current calendar year. The range also stops five years after the newest chart year and starts no earlier than 1955, or five years before the oldest chart year when that is later. A slider under the year shows those two end years, taken from the chart library. A year whose window has no No. 1s returns a short message instead of an empty playlist.

The playlist paints grouped by year before album art arrives. The first three years with songs request covers right away. Later years request covers when they are near the screen. A successful catalog lookup is cached in server memory for six hours. An empty or failed lookup is not cached, and the page tries a failed batch once more. List images use a 240px cover, and the song detail uses 800px. The Next.js image optimizer stays off because artwork hosts vary. A song with no catalog art shows a monogram.

Tap a song to open a large cover, a 30-second catalog preview (`previews[].url`, no sign-in), and an Open in Apple Music link. Full playback is offered only after Save to Apple Music has authorized MusicKit. **Covers** is optional: a horizontal, swipeable row inside each year, with arrow keys moving between albums. The default is the list, so year notes and chart order stay readable. A perspective Cover Flow was skipped because the extra motion would not make the songs clearer.

## Apple Music

This app does not use an Apple redirect URI. MusicKit JS asks the listener to approve access on the page, then the server creates the playlist with the developer token and that listener’s token.

In the Apple Developer account:

1. Create a key with MusicKit enabled and download the `.p8` once.
2. Set `APPLE_TEAM_ID`, `APPLE_KEY_ID`, and `APPLE_PRIVATE_KEY` on Vercel.
3. If the portal asks for website domains for MusicKit, add the production host (`playlisttimemachine.com` and the Vercel hostname). There is no callback path to register.

Songs are added in batches of 100. The page lists any songs Apple Music did not have.

People who already use another service can read `/from-spotify`. That page links to [Apple’s subscribe page](https://music.apple.com/us/subscribe) and [Apple’s guide to transferring music](https://support.apple.com/en-us/118249).

## Deploy checklist

1. Import the GitHub repo. Framework preset: Next.js. Package manager: pnpm. Build command: `pnpm build` or `next build`.
2. Add the Supabase and Apple Music variables above.
3. Open `/`, enter `1984`, and choose **Build my playlist**. The hit count is the library’s row count. Class of 1984 is 255 songs, starting with Too Much Heaven, Da Ya Think I'm Sexy?, and I Will Survive.
4. **Save to Apple Music** is the save button. Share is next to it.

## iOS app routes

The native app calls two routes. The website still builds and shares playlists through its server actions, and these routes do not change those pages.

| Route | Use |
| --- | --- |
| `GET /api/playlist?year=&genres=` | The eleven-year playlist, catalog matches, and the square playlist artwork. `GET /api/playlist` with no year returns the year limits. `GET /api/playlist?id=` opens a share link. |
| `POST /api/share` | Creates the same `shared_playlists` row as the website. The body is `{ graduationYear, title, genres }`. The service role key stays on the server. |
| `/.well-known/apple-app-site-association` | Universal links for `/p/*`. |

The association file uses app id `WS2R3SYV4W.com.abeba.playlisttimemachine`. Apple does not follow redirects when it fetches this file, and the response must be `200` with `Content-Type: application/json`.

`www.playlisttimemachine.com` is attached to production with no redirect, so `https://www.playlisttimemachine.com/.well-known/apple-app-site-association` is served by this route once the app is deployed.

`playlisttimemachine.com` is a Vercel domain redirect to `www.playlisttimemachine.com` (HTTP 307, `text/plain`, issued by Vercel before Next.js). No app route, `next.config` redirect, or middleware can answer that path on the apex while the domain redirect is on. Do not add `vercel.json`. To let Apple verify `applinks:playlisttimemachine.com`:

1. In the Vercel project `v0-playlist-time-machine-jv`, open Settings → Domains.
2. Edit `playlisttimemachine.com` and turn off **Redirect to** `www.playlisttimemachine.com`. Assign the apex to Production with no redirect, so both hosts reach this Next.js app.
3. After that, add an application redirect that sends every apex path except `/.well-known/apple-app-site-association` to the same path on `https://www.playlisttimemachine.com`. Leave the association file itself as a `200` with no `Location` header.

Until step 2 is done in the dashboard, the apex association file cannot be verified. This change is not made from the repo.
