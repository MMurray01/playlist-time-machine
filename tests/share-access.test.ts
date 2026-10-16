import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { isMissingRpcFunction } from "@/lib/playlist/errors"
import { BLOCKED_TITLE_WORDS, MAX_SHARE_GENRE_LENGTH, MAX_SHARE_GENRES, MAX_SHARE_TITLE_LENGTH } from "@/lib/playlist/ios-api"
import { MIN_GRADUATION_YEAR, MAX_PLAYLIST_TITLE_LENGTH } from "@/lib/playlist/window"

const migration = readFileSync("supabase/migrations/20261016130000_share_playlist_functions.sql", "utf8")
const share = readFileSync("lib/server/share.ts", "utf8")
const middleware = readFileSync("middleware.ts", "utf8")

function functionBody(name: string): string {
  const marker = `function public.${name}`
  const start = migration.indexOf(marker)
  expect(start).toBeGreaterThan(-1)
  const next = migration.indexOf("create or replace function", start + marker.length)
  const end = next === -1 ? migration.indexOf("revoke all on function", start) : next
  return migration.slice(start, end)
}

describe("share playlist migration", () => {
  it("creates two definer functions with a fixed search path and a closed execute grant", () => {
    expect(migration).toContain("create or replace function public.create_shared_playlist(")
    expect(migration).toContain("create or replace function public.get_shared_playlist(slug text)")
    expect(migration.match(/security definer/g)).toHaveLength(2)
    expect(migration.match(/set search_path = ''/g)).toHaveLength(2)
    expect(migration).toContain(
      "revoke all on function public.create_shared_playlist(integer, text[], text) from public;",
    )
    expect(migration).toContain("revoke all on function public.get_shared_playlist(text) from public;")
    expect(migration).toContain(
      "grant execute on function public.create_shared_playlist(integer, text[], text) to anon, authenticated;",
    )
    expect(migration).toContain(
      "grant execute on function public.get_shared_playlist(text) to anon, authenticated;",
    )
  })

  it("inserts one playlist row and checks the same limits as the share endpoint", () => {
    const create = functionBody("create_shared_playlist")
    expect(create.match(/insert into public\.shared_playlists/gi)).toHaveLength(1)
    expect(create.toLowerCase()).not.toContain("update ")
    expect(create.toLowerCase()).not.toContain("delete ")
    expect(create).toContain(`graduation_year < ${MIN_GRADUATION_YEAR}`)
    expect(create).toContain(`char_length(coalesce(title, '')) > ${MAX_SHARE_TITLE_LENGTH}`)
    expect(create).toContain(`left(clean_title, ${MAX_PLAYLIST_TITLE_LENGTH})`)
    expect(create).toContain(`cardinality(genres) > ${MAX_SHARE_GENRES}`)
    expect(create).toContain(`char_length(genre_name) > ${MAX_SHARE_GENRE_LENGTH}`)
    for (const word of BLOCKED_TITLE_WORDS) expect(create).toContain(`'${word}'`)
  })

  it("stops anonymous listing and drops the unused birth columns", () => {
    expect(migration).toContain("drop policy if exists shared_playlists_public_select")
    expect(migration).not.toContain("using (true)")
    expect(migration).toContain("create policy shared_playlists_owner_select")
    expect(migration).toContain("to authenticated")
    expect(migration).toContain("drop column if exists birth_year")
    expect(migration).toContain("drop column if exists birth_month")
    const lookup = functionBody("get_shared_playlist")
    expect(lookup).toContain("where playlist.id = slug")
    expect(lookup.toLowerCase()).not.toContain("insert ")
  })
})

describe("share reads and writes", () => {
  it("calls the functions with the anon client", () => {
    expect(share).toContain('rpc("create_shared_playlist"')
    expect(share).toContain('rpc("get_shared_playlist"')
    expect(share).toContain("createAnonClient()")
    expect(share).not.toContain("birth_year")
    expect(share).not.toContain("birth_month")
    expect(middleware).toContain("/rest/v1/rpc/get_shared_playlist")
    expect(isMissingRpcFunction({ code: "PGRST202", message: "Could not find the function" })).toBe(true)
    expect(isMissingRpcFunction({ message: "Could not find the function public.get_shared_playlist" })).toBe(true)
    expect(
      isMissingRpcFunction({
        code: "PGRST204",
        message: "Could not find the 'title' column of 'shared_playlists' in the schema cache",
      }),
    ).toBe(false)
    expect(isMissingRpcFunction(null)).toBe(false)
  })
})
