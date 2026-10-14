# Playlist Time Machine

Playlist Time Machine turns a high school graduation year into every Billboard Hot 100 No. 1 from the five years before that year through the five years after. The songs stay in chart order. Nothing is filled in from a hardcoded list.

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

Enter a graduation year. Class of 1984 covers 1979 through 1989: 217 No. 1s, starting with Le Freak, Too Much Heaven, and I Will Survive. Styles are optional. Leave them off to include every song.

Each year has a short note built from the chart rows: how many songs reached No. 1, which songs are listed with the most weeks at No. 1, and which artists had the most No. 1s. `lib/playlist/editorial.ts` is where a later hand-written note can sit beside those facts.

Save the playlist to Apple Music in one tap. Songs are added in batches of 100. The page reports how many songs matched and lists the ones Apple Music did not have. People coming from another service can open `/from-spotify`.

Share creates a public page at `/p/[id]` with the same year notes and save buttons.

## Data

Songs come from the `number_one_hits` view. See [docs/README.md](docs/README.md) for Apple Music and the database migration.

## Database migration

`supabase/migrations/20261014020000_shared_playlist_title.sql` adds an optional playlist title and revokes public writes on the chart view. Apply it before relying on custom share titles. The app still saves and opens links if the title column is not there yet.
