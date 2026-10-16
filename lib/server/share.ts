import "server-only"

import { cache } from "react"
import { headers } from "next/headers"
import { isMissingColumnError } from "@/lib/playlist/errors"
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
import { createReadClient, createWriteClient } from "@/lib/server/supabase"

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

  const client = createWriteClient()
  if (!client) {
    return {
      ok: false,
      error: "Sharing needs the server database key. The playlist is still on this page.",
    }
  }

  const limited = await limitShareCreate(await shareCreateAddress())
  if (!limited.allowed) {
    return {
      ok: false,
      status: 429,
      retryAfterSeconds: limited.retryAfterSeconds,
      error: shareCreateLimitedMessage(limited.retryAfterSeconds),
    }
  }

  const id = createShareId()
  const title = cleanPlaylistTitle(input.title, input.graduationYear)
  const genres = input.genres.map((genre) => genre.trim()).filter(Boolean)
  const row = {
    id,
    graduation_year: input.graduationYear,
    genres,
    title,
    birth_year: null,
    birth_month: null,
  }

  let { error } = await client.from("shared_playlists").insert(row)
  if (error && isMissingColumnError(error, "title")) {
    const { title: _title, ...withoutTitle } = row
    const retry = await client.from("shared_playlists").insert(withoutTitle)
    error = retry.error
  }

  if (error) {
    console.error("shared playlist insert failed", error.code)
    return { ok: false, error: "The share link could not be saved. Try again." }
  }

  const origin = await requestOrigin()
  return { ok: true, id, url: `${origin}/p/${id}` }
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
  const client = createReadClient()
  if (!client) return { ok: false, reason: "unavailable" }

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

  if (result.error) return { ok: false, reason: "unavailable" }
  if (!result.data || typeof result.data.graduation_year !== "number") {
    return { ok: false, reason: "not_found" }
  }
  if (!isValidGraduationYear(result.data.graduation_year)) {
    return { ok: false, reason: "not_found" }
  }

  const storedTitle = "title" in result.data && typeof result.data.title === "string" ? result.data.title : ""
  const title = storedTitle.trim()
    ? cleanPlaylistTitle(storedTitle, result.data.graduation_year)
    : defaultPlaylistTitle(result.data.graduation_year)

  const loaded = await loadBuiltPlaylist({
    graduationYear: result.data.graduation_year,
    genres: [],
    title,
  })
  if (!loaded.ok) return { ok: false, reason: "unavailable" }
  return { ok: true, id, playlist: loaded.playlist }
})
