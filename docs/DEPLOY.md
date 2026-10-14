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
| `NEXT_PUBLIC_SITE_URL` | Optional absolute origin for a share link when the request has no host. Vercel sends `x-forwarded-host`, so leave this empty unless you want to force one origin. |

`NEXT_PUBLIC_*` values are inlined at build time. Redeploy after changing them.

Apply `supabase/migrations/20261014020000_shared_playlist_title.sql` yourself if a database does not have `shared_playlists.title` yet. Deploy does not change the database. If `title` is missing, share pages fall back to “Class of {year}”.

There is no Apple song id on `number_one_hits` today, so this deploy does not add one. Matching uses the song title and artist. If a row includes `apple_song_id`, the matcher uses that catalog id only when the title and artist still agree. No migration was added.

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
3. Open `/`, enter `1984`, and choose **Build my playlist**. Class of 1984 is 217 songs, starting with Le Freak, Too Much Heaven, and I Will Survive.
4. **Save to Apple Music** is the save button. Share is next to it.
