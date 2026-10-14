# Music service and the chart library

Saving a playlist uses Apple Music. Spotify is not a save option.

## Environment

Set these in the host, not in git. `.env.example` lists every name. Vercel steps are in [DEPLOY.md](DEPLOY.md).

| Name | Used for |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Chart library and shared playlist pages |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public reads |
| `SUPABASE_SERVICE_ROLE_KEY` | Creating share links. Server only. |
| `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` | Apple Music developer token. All three are required to save and to load album art. |
| `NEXT_PUBLIC_SITE_URL` | Optional fallback for share links |

`APPLE_PRIVATE_KEY` is the contents of the MusicKit `.p8` file. A single line with `\n` in place of line breaks is fine. The token is signed on the server (ES256, issuer = team id, `kid` = key id) and handed to MusicKit JS in the browser. It is not a user token.

The app builds a playlist with only the Supabase URL and anon key. **Save to Apple Music** stays on the page either way. If the Apple variables are missing, saving explains that Apple Music is not set up yet.

## Apple Music

1. Create a MusicKit key in the Apple developer account.
2. Set `APPLE_TEAM_ID`, `APPLE_KEY_ID`, and `APPLE_PRIVATE_KEY`.
3. The site loads MusicKit JS, asks the listener to approve access, then creates the library playlist.

There is no Apple redirect URI. If the developer portal asks for a website domain, add the site host only.

Matching uses the title and artist, including a second search with the main artist and a title-only search. Parentheses, featured credits, a leading “The”, and catalog extras such as remasters or a missing “Pt. 2” still count as the same song. A stored `apple_song_id` or `isrc` on the chart row is used when that column exists and the recording still matches. If Apple Music catalog search is unavailable, the public iTunes Search API supplies the cover and the 30-second preview. Empty lookups are not cached, so a failed search can be tried again. Songs that are still missing keep a monogram in place of the cover.

The create call includes the first 100 catalog songs. Further songs go out in batches of 100 on the add-tracks call.

Search uses the developer token only. The listener’s Music User Token is sent to the server for the create call and is not stored.

## Coming from another service

`/from-spotify` explains the one-tap save, links to [Apple’s subscribe page](https://music.apple.com/us/subscribe), and links to [Apple’s guide to transferring music from another service](https://support.apple.com/en-us/118249).

## Chart library

`number_one_hits` is the only song source. The window is the `year` column, ordered by `chart_date`, then `week_number`, then `song_id`. A repeated `song_id` keeps its earliest chart date.

The page, the year headers, and the text and CSV downloads count those rows. Nothing on the page hardcodes the length of a class. Class of 1984 (`year` 1979 through 1989) is 255 songs in the current library and starts with Too Much Heaven, Da Ya Think I'm Sexy?, and I Will Survive.

`data/catalog-matches.json` holds an Apple Music id, artwork URL, and preview URL for each song. `pnpm catalog` rebuilds it from the library. Opening a playlist reads that file instead of searching Apple for every song.

Year notes are computed from those rows (count of No. 1s, longest `weeks_at_position`, artists with the most No. 1s). They do not add outside history. Richer copy can be added later in `lib/playlist/editorial.ts`.

## Migration

Run `supabase/migrations/20261014020000_shared_playlist_title.sql` on the database if it is not applied yet.

It adds `shared_playlists.title` for a gift or reunion name. Share pages fall back to “Class of {year}” when the column is missing or null.

`number_one_hits` is a view over `chart_entries`, `songs`, `artists`, and `genres`. It cannot take row level security directly, and it has to keep running as the owner: `chart_entries` is limited to song owners, so a security-invoker view would hide the chart. The view is not auto-updatable. The migration revokes insert, update, and delete on it from the public API roles. Do not put the service role key in a `NEXT_PUBLIC_` variable.
