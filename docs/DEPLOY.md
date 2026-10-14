# Deploy on Vercel

The app is a Next.js server app. Vercel detects it from `package.json` and `pnpm-lock.yaml`. Do not add `vercel.json`, and do not set an output directory or a static export.

`pnpm build` (`next build`) is the production build. It does not need Apple Music or the Supabase service role.

## Minimum environment

The site builds playlists and can save them to Spotify with these four variables. Set them in the Vercel project under **Settings → Environment Variables** for Production. Add the same values to Preview if you want preview deployments to read the chart and sign in to Spotify.

| Name | Required | Value |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL, `https://<project-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon (public) key |
| `SPOTIFY_CLIENT_ID` | Yes, to save | Spotify app client id. `NEXT_PUBLIC_SPOTIFY_CLIENT_ID` is accepted as a fallback. Prefer `SPOTIFY_CLIENT_ID`. |
| `SPOTIFY_CLIENT_SECRET` | Yes, for a normal Spotify app | Client secret. Used for the token exchange and for album art before someone signs in. |

Without the Spotify pair, the page still builds a playlist. **Save to Spotify** stays disabled and the page says Spotify is not set up.

## Optional environment

| Name | When to set it |
| --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | Creating a share link. Server only. Never prefix it with `NEXT_PUBLIC_`. Without it, the playlist stays on the page and Share explains that the server key is missing. |
| `SPOTIFY_REDIRECT_URI` | Only if the callback is not `{the site origin}/callback`. No trailing slash. |
| `APPLE_TEAM_ID` | Apple Music. All three Apple variables are required together. If any are missing, **Save to Apple Music** is hidden. |
| `APPLE_KEY_ID` | The MusicKit key id (`kid` on the developer token). |
| `APPLE_PRIVATE_KEY` | The MusicKit `.p8` file. Paste the PEM. Real line breaks or the two characters `\n` both work. |
| `NEXT_PUBLIC_SITE_URL` | Optional absolute origin for a share link when the request has no host. Vercel sends `x-forwarded-host`, so leave this empty unless you want to force one origin. |

Apply `supabase/migrations/20261014020000_shared_playlist_title.sql` yourself if a database does not have `shared_playlists.title` yet. This repo does not apply that migration during deploy. If the column is missing, share pages fall back to “Class of {year}”.

## Spotify redirect URIs

In the [Spotify developer dashboard](https://developer.spotify.com/dashboard), open the app and add every callback the browser will actually use. Spotify matches the full string. No trailing slash.

The app’s default callback is `{origin}/callback`. Both of these routes complete sign-in:

- `/callback`
- `/api/spotify/callback`

Register the one you use. If `SPOTIFY_REDIRECT_URI` is unset, register `/callback` on each origin.

Production, for the current site:

- `https://playlisttimemachine.com/callback`
- `https://playlisttimemachine.com/api/spotify/callback`

Also add the Vercel production hostname if it is different, for example:

- `https://<project>.vercel.app/callback`
- `https://<project>.vercel.app/api/spotify/callback`

Local:

- `http://localhost:3000/callback`
- `http://127.0.0.1:3000/callback`

Preview deployments get a new hostname each time. Spotify will reject sign-in on a preview URL until that exact `https://<deployment>.vercel.app/callback` is on the allow list, or until `SPOTIFY_REDIRECT_URI` points at a stable callback. A redirect URI on a different host will not finish sign-in, because the login cookies are set on the host that started it. Test Save to Spotify on the production domain or one stable preview alias you have registered.

Scopes requested: `playlist-modify-private` and `playlist-modify-public`. The playlist is created private.

## Apple Music

This app does not use an Apple redirect URI. MusicKit JS asks the listener to approve access on the page, then the server creates the playlist with the developer token and that listener’s token.

In the Apple Developer account:

1. Create a key with MusicKit enabled and download the `.p8` once.
2. Set `APPLE_TEAM_ID`, `APPLE_KEY_ID`, and `APPLE_PRIVATE_KEY` on Vercel.
3. If the portal asks for website domains for MusicKit, add the production host (`playlisttimemachine.com` and the Vercel hostname). Do not invent a callback path. There is nothing to put in `SPOTIFY_REDIRECT_URI` for Apple.

Leave the three Apple variables unset to ship with Supabase and Spotify only.

## Deploy checklist

1. Import the GitHub repo. Framework preset: Next.js. Package manager: pnpm. Build command: `pnpm build` or `next build`.
2. Add the four minimum variables above. Redeploy after saving them. `NEXT_PUBLIC_*` values are inlined at build time.
3. Add the Spotify redirect URIs for the production origin.
4. Open `/`, enter `1984`, and choose **Build my playlist**. Class of 1984 is 217 songs, starting with Le Freak, Too Much Heaven, and I Will Survive.
5. **Save to Apple Music** should be absent until the Apple variables are set.
