import "server-only"

import { cache } from "react"
import { headers } from "next/headers"
import type { SupabaseClient } from "@supabase/supabase-js"
import { isMissingColumnError, isMissingRpcFunction } from "@/lib/playlist/errors"
import { abusivePlaylistTitle, MAX_SHARE_GENRES } from "@/lib/playlist/ios-api"
import { createShareId, isShareId } from "@/lib/playlist/ids"
import type { BuiltPlaylist } from "@/lib/playlist/types"
import {
  cleanPlaylistTitle,
  defaultPlaylistTitle,
  graduationYearLimits,
  graduationYearMessage,
  isValidGraduationYear,
} from "@/lib/playlist/window"
import { clientAddress, shareCreateLimitedMessage } from "@/lib/playlist/share-rate-limit"
import { loadBuiltPlaylist } from "@/lib/server/chart"
import { limitShareCreate } from "@/lib/server/share-rate-limit"
import { createAnonClient, createWriteClient } from "@/lib/server/supabase"

const SAVE_ERROR = "The share link could not be saved. Try again."
const CONNECTION_ERROR = "Sharing needs the database connection. The playlist is still on this page."
const SERVER_KEY_ERROR = "Sharing needs the server database key. The playlist is still on this page."

const FUNCTION_ERRORS = [
  "That playlist name is too long.",
  "Choose fewer genres.",
  "Those genres could not be used.",
  "Enter the year you graduated high school.",
  "Choose a playlist name without abusive language.",
]

type StoredPlaylist = {
  graduation_year: number
  title: string
}

function knownFunctionError(error: { message?: string } | null | undefined): string | null {
  const message = error?.message ?? ""
  return FUNCTION_ERRORS.find((item) => message.includes(item)) ?? null
}

function storedPlaylist(row: { graduation_year?: unknown; title?: unknown } | null): StoredPlaylist | null {
  if (!row || typeof row.graduation_year !== "number") return null
  return {
    graduation_year: row.graduation_year,
    title: typeof row.title === "string" ? row.title : "",
  }
}

export async function requestOrigin(): Promise<string> {
  const headerList = await headers()
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host")
  const proto = headerList.get("x-forwarded-proto") ?? "http"
  if (host) return `${proto}://${host}`
  return "http://localhost:3000"
}

export async function createSharedPlaylist(input: {
  graduationYear: number
  genres: string[]
  title: string
}): Promise<
  | { ok: true; id: string; url: string }
  | { ok: false; error: string; status?: number; retryAfterSeconds?: number }
> {
  const limits = graduationYearLimits()
  if (!isValidGraduationYear(input.graduationYear, limits)) {
    return { ok: false, error: graduationYearMessage(input.graduationYear, limits) }
  }

  const title = cleanPlaylistTitle(input.title, input.graduationYear)
  if (input.title.trim() && abusivePlaylistTitle(title)) {
    return { ok: false, error: "Choose a playlist name without abusive language." }
  }

  const genres = input.genres.map((genre) => genre.trim()).filter(Boolean)
  if (genres.length > MAX_SHARE_GENRES) {
    return { ok: false, error: "Choose fewer genres." }
  }

  const client = createAnonClient()
  if (!client) return { ok: false, error: CONNECTION_ERROR }

  const limited = await limitShareCreate(await shareCreateAddress())
  if (!limited.allowed) {
    return {
      ok: false,
      status: 429,
      retryAfterSeconds: limited.retryAfterSeconds,
      error: shareCreateLimitedMessage(limited.retryAfterSeconds),
    }
  }

  const created = await client.rpc("create_shared_playlist", {
    graduation_year: input.graduationYear,
    genres,
    title,
  })

  let id: string | null = null
  if (!created.error && typeof created.data === "string" && isShareId(created.data)) {
    id = created.data
  } else if (created.error && isMissingRpcFunction(created.error)) {
    const fallback = await insertUntilMigration({
      graduationYear: input.graduationYear,
      genres,
      title,
    })
    if (!fallback.ok) return fallback
    id = fallback.id
  } else {
    const known = knownFunctionError(created.error)
    if (known) return { ok: false, error: known }
    console.error("shared playlist insert failed", created.error?.code ?? "empty")
    return { ok: false, error: SAVE_ERROR }
  }

  const origin = await requestOrigin()
  return { ok: true, id, url: `${origin}/p/${id}` }
}

/**
 * The previous website inserted with the service role. Keep that path only
 * until `create_shared_playlist` exists, so this deploy can go out first.
 * A validation error from the function must not fall through to this insert.
 */
async function insertUntilMigration(input: {
  graduationYear: number
  genres: string[]
  title: string
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const client = createWriteClient()
  if (!client) return { ok: false, error: SERVER_KEY_ERROR }

  const id = createShareId()
  const row = {
    id,
    graduation_year: input.graduationYear,
    genres: input.genres,
    title: input.title,
  }
  let { error } = await client.from("shared_playlists").insert(row)
  if (error && isMissingColumnError(error, "title")) {
    const { title: _title, ...withoutTitle } = row
    const retry = await client.from("shared_playlists").insert(withoutTitle)
    error = retry.error
  }
  if (error) {
    console.error("shared playlist insert failed", error.code)
    return { ok: false, error: SAVE_ERROR }
  }
  return { ok: true, id }
}

async function shareCreateAddress(): Promise<string> {
  try {
    return clientAddress(await headers())
  } catch {
    return "unknown"
  }
}

export type SharedPlaylistPage =
  | { ok: true; id: string; playlist: BuiltPlaylist }
  | { ok: false; reason: "not_found" | "unavailable" }

export const getSharedPlaylistPage = cache(async (id: string): Promise<SharedPlaylistPage> => {
  if (!isShareId(id)) return { ok: false, reason: "not_found" }
  const client = createAnonClient()
  if (!client) return { ok: false, reason: "unavailable" }

  const loaded = await readStoredPlaylist(client, id)
  if (loaded === "error") return { ok: false, reason: "unavailable" }
  if (!loaded) return { ok: false, reason: "not_found" }
  if (!isValidGraduationYear(loaded.graduation_year)) return { ok: false, reason: "not_found" }

  const storedTitle = loaded.title.trim()
  const title = storedTitle
    ? cleanPlaylistTitle(storedTitle, loaded.graduation_year)
    : defaultPlaylistTitle(loaded.graduation_year)

  const built = await loadBuiltPlaylist({
    graduationYear: loaded.graduation_year,
    genres: [],
    title,
  })
  if (!built.ok) return { ok: false, reason: "unavailable" }
  return { ok: true, id, playlist: built.playlist }
})

async function readStoredPlaylist(client: SupabaseClient, id: string): Promise<StoredPlaylist | null | "error"> {
  const rpc = await client.rpc("get_shared_playlist", { slug: id })
  if (rpc.error && isMissingRpcFunction(rpc.error)) return readSharedPlaylistTable(client, id)
  if (rpc.error) return "error"
  return storedPlaylist(rpc.data as { graduation_year?: unknown; title?: unknown } | null)
}

async function readSharedPlaylistTable(
  client: SupabaseClient,
  id: string,
): Promise<StoredPlaylist | null | "error"> {
  let result = await client
    .from("shared_playlists")
    .select("id, graduation_year, genres, title, created_at")
    .eq("id", id)
    .maybeSingle()

  if (result.error && isMissingColumnError(result.error, "title")) {
    result = await client
      .from("shared_playlists")
      .select("id, graduation_year, genres, created_at")
      .eq("id", id)
      .maybeSingle()
  }

  if (result.error) return "error"
  return storedPlaylist(result.data)
}
