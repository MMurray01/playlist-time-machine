# Playlist Time Machine

Playlist Time Machine turns a high school graduation year into the number one hits from the five years before that year through the five years after, the popular songs of the time. The songs stay in the order they reached the top. Nothing is filled in from a hardcoded list.

## Run it

```bash
pnpm install
pnpm dev
```

Copy `.env.example` to `.env.local`. The Supabase URL and anon key are enough to build a playlist. Saving to Apple Music also needs `APPLE_TEAM_ID`, `APPLE_KEY_ID`, and `APPLE_PRIVATE_KEY`. Share links need `SUPABASE_SERVICE_ROLE_KEY`. Vercel setup is in [docs/DEPLOY.md](docs/DEPLOY.md).

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

## What you get

Enter the year you graduated high school. The latest year is the current year, and it stays inside the years the chart library covers. A year with no No. 1s gets a short message. The song count on the page is the number of rows in that window. Class of 1984 covers 1979 through 1989 and, in the current library, is 255 songs, starting with Too Much Heaven, Da Ya Think I'm Sexy?, and I Will Survive.

Each year has a short note built from the chart rows: how many songs reached No. 1, which songs are listed with the most weeks at No. 1, and which artists had the most No. 1s. `lib/playlist/editorial.ts` is where a later hand-written note can sit beside those facts.

The song list appears immediately, grouped by year. Covers for the first three years load first; later years load as you scroll. Tap a song for a large cover and a 30-second Apple Music preview. No sign-in is required for that preview. After you save, a subscriber can play the full song. **Covers** is an optional horizontal browse for one year. The default view stays a list.

Save the playlist to Apple Music in one tap. Songs are added in batches of 100. The page reports how many songs matched and lists the ones Apple Music did not have. People coming from another service can open `/from-spotify`.

Share creates a public page at `/p/[id]` with the same year notes and save buttons. A text or CSV download lists the artist, song, and year for someone without Apple Music. How it works, privacy, and terms are in the footer.

## Data

Songs come from the `number_one_hits` view. See [docs/README.md](docs/README.md) for Apple Music and the database migration.

Covers and previews are matched ahead of time. `pnpm catalog` reads the song library and writes `data/catalog-matches.json`, waiting out the public iTunes limit. The site reads that file, so a visitor does not send a search for every song.

## Database migration

`supabase/migrations/20261014020000_shared_playlist_title.sql` adds an optional playlist title and revokes public writes on the chart view. Apply it before relying on custom share titles. The app still saves and opens links if the title column is not there yet.
