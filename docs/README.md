# Music services and the chart library

This replaces the old root `SPOTIFY_*.md` notes. Those files described one-song Spotify calls, debug pages, and a client id checked into the repo. None of that is part of the app now.

## Environment

Set these in the host, not in git. `.env.example` lists every name.

| Name | Used for |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Chart library and shared playlist pages |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public reads |
| `SUPABASE_SERVICE_ROLE_KEY` | Creating share links. Server only. |
| `SPOTIFY_CLIENT_ID` or `NEXT_PUBLIC_SPOTIFY_CLIENT_ID` | Spotify sign-in |
| `SPOTIFY_CLIENT_SECRET` | Optional. Album art and catalog search before sign-in. Also used when exchanging the Spotify code if the app is confidential. |
| `SPOTIFY_REDIRECT_URI` | Optional. Defaults to `{origin}/callback` |
| `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` | Apple Music developer token. All three are required. |
| `NEXT_PUBLIC_SITE_URL` | Optional fallback for share links |

`APPLE_PRIVATE_KEY` is the contents of the MusicKit `.p8` file. A single line with `\n` in place of line breaks is fine. The token is signed on the server (ES256, issuer = team id, `kid` = key id) and handed to MusicKit JS in the browser. It is not a user token.

If any Apple variable is missing, Save to Apple Music is not shown.

## Spotify

1. In the [Spotify developer dashboard](https://developer.spotify.com/dashboard), create an app.
2. Add redirect URIs with no trailing slash:
   - `http://localhost:3000/callback`
   - `https://playlisttimemachine.com/callback`
   - The same paths with `/api/spotify/callback` if you set `SPOTIFY_REDIRECT_URI` to that URL
3. Put the client id in `SPOTIFY_CLIENT_ID`. Put the secret in `SPOTIFY_CLIENT_SECRET` if the Spotify app has one.

Sign-in uses PKCE. The code verifier and the access token stay in httpOnly cookies. The browser never sees the client secret.

Saving a playlist:

1. Search the catalog for each song (a stored `spotify_track_id` is used when the chart row has one).
2. Create one private playlist.
3. Add songs with `POST /playlists/{id}/tracks`, 100 URIs per request, which is the API maximum.
4. Read the playlist’s track total and show how many were saved.
5. List songs the catalog did not have.

A failed batch is retried once. If it still fails, the page says how many songs were saved and stops counting the rest as saved.

Scopes: `playlist-modify-private` and `playlist-modify-public`.

## Apple Music

1. Create a MusicKit key in the Apple developer account.
2. Set `APPLE_TEAM_ID`, `APPLE_KEY_ID`, and `APPLE_PRIVATE_KEY`.
3. The site loads MusicKit JS, asks the listener to approve access, then creates the library playlist.

The create call includes the first 100 catalog songs. Further songs go out in batches of 100 on the add-tracks call. Adding songs one at a time is what dropped tracks in an earlier iOS build, so this app does not do that.

Apple Music search uses the developer token only. The listener’s Music User Token is sent to the server for the create call and is not stored.

## Chart library

`number_one_hits` is the only song source. The window is the `year` column, ordered by `chart_date`, then `week_number`, then `song_id`. A repeated `song_id` keeps its earliest chart date.

Class of 1984 (`year` 1979 through 1989) is 217 songs and starts:

1. Le Freak — Chic
2. Too Much Heaven — Bee Gees
3. I Will Survive — Gloria Gaynor

Year notes are computed from those rows (count of No. 1s, longest `weeks_at_position`, artists with the most No. 1s). They do not add outside history. Richer copy can be added later in `lib/playlist/editorial.ts`.

## Migration

Run `supabase/migrations/20261014020000_shared_playlist_title.sql` on the database.

It adds `shared_playlists.title` for a gift or reunion name. Share pages fall back to “Class of {year}” when the column is missing or null.

`number_one_hits` is a view over `chart_entries`, `songs`, `artists`, and `genres`. It cannot take row level security directly, and it has to keep running as the owner: `chart_entries` is limited to song owners, so a security-invoker view would hide the chart. The view is not auto-updatable. The migration revokes insert, update, and delete on it from the public API roles. Do not put the service role key in a `NEXT_PUBLIC_` variable.
