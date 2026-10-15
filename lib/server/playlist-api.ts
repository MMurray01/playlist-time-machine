import "server-only"

import { NextResponse } from "next/server"
import { buildPlaylist } from "@/lib/playlist/hits"
import { buildPlaylistPayload, ITUNES_PREVIEW_ATTRIBUTION, parsePlaylistQuery } from "@/lib/playlist/ios-api"
import type { BuiltPlaylist } from "@/lib/playlist/types"
import {
  emptyChartMessage,
  graduationYearLimits,
  graduationYearMessage,
  isValidGraduationYear,
} from "@/lib/playlist/window"
import { getChartYearSpan, loadBuiltPlaylist } from "@/lib/server/chart"
import { getAffiliateToken } from "@/lib/server/env"
import { resolveHitCatalog } from "@/lib/server/match-playlist"
import { getSharedPlaylistPage, requestOrigin } from "@/lib/server/share"

async function limitsForRequest() {
  const span = await getChartYearSpan()
  return {
    limits: graduationYearLimits({ chartMinYear: span.minYear, chartMaxYear: span.maxYear }),
    limitsError: span.error,
    chartConnected: span.error == null && typeof span.minYear === "number",
  }
}

function json(body: unknown, status: number, cache: string) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": cache },
  })
}

/**
 * JSON for the iOS app. The website keeps using its server actions, so this
 * route does not change what a browser renders.
 */
export async function playlistResponse(requestUrl: string): Promise<NextResponse> {
  const parsed = parsePlaylistQuery(new URL(requestUrl).searchParams)
  if (parsed.kind === "error") {
    return json({ ok: false, error: parsed.error }, parsed.status, "no-store")
  }

  const { limits, limitsError, chartConnected } = await limitsForRequest()
  if (parsed.kind === "limits") {
    return json(
      {
        ok: true,
        version: 1,
        courtesy: ITUNES_PREVIEW_ATTRIBUTION,
        limits,
        chartConnected,
        error: limitsError,
      },
      200,
      "public, s-maxage=300, stale-while-revalidate=3600",
    )
  }

  let full: BuiltPlaylist
  let share: { id: string; url: string } | null = null
  let recipientYear: number | null = null

  if (parsed.kind === "share") {
    const page = await getSharedPlaylistPage(parsed.id)
    if (!page.ok && page.reason === "not_found") {
      return json({ ok: false, error: "This playlist link is not here." }, 404, "no-store")
    }
    if (!page.ok) {
      return json(
        { ok: false, error: "The chart library could not be read. Try again in a moment.", limits },
        503,
        "no-store",
      )
    }
    full = page.playlist
    share = { id: page.id, url: `${await requestOrigin()}/p/${page.id}` }
    recipientYear = page.playlist.graduationYear
  } else {
    if (!isValidGraduationYear(parsed.year, limits)) {
      return json({ ok: false, error: graduationYearMessage(parsed.year, limits), limits }, 400, "no-store")
    }
    const loaded = await loadBuiltPlaylist({ graduationYear: parsed.year, genres: [] })
    if (!loaded.ok) return json({ ok: false, error: loaded.error, limits }, 503, "no-store")
    full = loaded.playlist
  }

  if (full.hits.length === 0) {
    return json({ ok: false, error: emptyChartMessage(full.graduationYear), limits }, 422, "no-store")
  }

  const genres = parsed.kind === "year" ? parsed.genres : []
  const visible =
    genres.length === 0
      ? full
      : buildPlaylist({
          graduationYear: full.graduationYear,
          genres,
          hits: full.hits,
          title: full.title,
        })

  let catalog: Awaited<ReturnType<typeof resolveHitCatalog>> = { matches: [], unmatched: [] }
  try {
    catalog = await resolveHitCatalog(full.hits)
  } catch (error) {
    console.error("playlist catalog match failed", error instanceof Error ? error.message : "unknown")
  }

  const payload = buildPlaylistPayload({
    visible,
    artworkSource: full,
    matches: catalog.matches,
    unmatched: catalog.unmatched,
    limits,
    limitsError,
    share,
    recipientYear,
    affiliateToken: getAffiliateToken(),
    filterMessage:
      genres.length > 0 && visible.hits.length === 0
        ? "No number one hits in those genres for this window."
        : null,
  })

  return json(payload, 200, parsed.kind === "share" ? "no-store" : "public, s-maxage=300, stale-while-revalidate=3600")
}
