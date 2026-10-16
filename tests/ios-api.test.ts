import { readFileSync, readdirSync, statSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { buildPlaylist } from "@/lib/playlist/hits"
import {
  abusivePlaylistTitle,
  appleAppSiteAssociation,
  APPLE_TEAM_ID,
  availableGenres,
  buildPlaylistPayload,
  IOS_BUNDLE_ID,
  ITUNES_PREVIEW_ATTRIBUTION,
  parsePlaylistQuery,
  parseShareBody,
  playlistShareCopy,
  shareErrorStatus,
  shareFailureHeaders,
} from "@/lib/playlist/ios-api"
import { shareCreateLimitedMessage } from "@/lib/playlist/share-rate-limit"
import type { ChartHit } from "@/lib/playlist/types"

function hit(overrides: Partial<ChartHit> & Pick<ChartHit, "title" | "artist" | "year">): ChartHit {
  return {
    songId: overrides.songId ?? null,
    year: overrides.year,
    weekNumber: overrides.weekNumber ?? 1,
    chartDate: overrides.chartDate ?? `${overrides.year}-06-01`,
    title: overrides.title,
    artist: overrides.artist,
    genre: overrides.genre ?? "Pop",
    appleSongId: overrides.appleSongId ?? null,
    weeksAtNumberOne: overrides.weeksAtNumberOne ?? 1,
  }
}

function readTree(dir: string): string {
  const parts: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) parts.push(readTree(full))
    else if (/\.(swift|ts|tsx|plist|yml|md|entitlements)$/.test(entry)) parts.push(readFileSync(full, "utf8"))
  }
  return parts.join("\n")
}

describe("iOS API contract", () => {
  const songs = [
    hit({ songId: 1, title: "Too Much Heaven", artist: "Bee Gees", year: 1979, genre: "Soul", weeksAtNumberOne: 2 }),
    hit({ songId: 2, title: "Da Ya Think I'm Sexy?", artist: "Rod Stewart", year: 1979, genre: "Rock", weeksAtNumberOne: 1 }),
    hit({ songId: 3, title: "I Will Survive", artist: "Gloria Gaynor", year: 1979, genre: "Dance", weeksAtNumberOne: 3 }),
  ]

  it("parses a year, a genre list, and a share id", () => {
    expect(parsePlaylistQuery(new URLSearchParams())).toEqual({ kind: "limits" })
    expect(parsePlaylistQuery(new URLSearchParams("year=1984"))).toEqual({ kind: "year", year: 1984, genres: [] })
    expect(parsePlaylistQuery(new URLSearchParams("year=1984&genres=Dance,Soul"))).toEqual({
      kind: "year",
      year: 1984,
      genres: ["Dance", "Soul"],
    })
    expect(parsePlaylistQuery(new URLSearchParams("id=hvNkUNU7FX&year=1999"))).toEqual({
      kind: "share",
      id: "hvNkUNU7FX",
    })
    expect(parsePlaylistQuery(new URLSearchParams("year=84")).kind).toBe("error")
    expect(parsePlaylistQuery(new URLSearchParams("id=no")).kind).toBe("error")
    expect(parsePlaylistQuery(new URLSearchParams("year=1984&genres=Dance%20Pop"))).toEqual({
      kind: "year",
      year: 1984,
      genres: ["Dance Pop"],
    })
    expect(parsePlaylistQuery(new URLSearchParams("year=1984&genres=Dance<script>")).kind).toBe("error")
  })

  it("cleans a share title and rejects an abusive one", () => {
    expect(parseShareBody({ graduationYear: 1984, title: "  Reunion  " })).toEqual({
      ok: true,
      graduationYear: 1984,
      title: "Reunion",
      genres: [],
    })
    expect(parseShareBody({ graduationYear: 1984, title: "   " })).toMatchObject({
      ok: true,
      title: "Class of 1984",
    })
    const blocked = parseShareBody({ graduationYear: 1984, title: "what the fuck" })
    expect(blocked).toEqual({ ok: false, error: "Choose a playlist name without abusive language." })
    expect(abusivePlaylistTitle("Class of 1984")).toBe(false)
    expect(parseShareBody(null)).toMatchObject({ ok: false })
    expect(shareErrorStatus("Sharing needs the server database key. The playlist is still on this page.")).toBe(503)
    expect(shareErrorStatus("Sharing needs the database connection. The playlist is still on this page.")).toBe(503)
    expect(shareErrorStatus("The share link could not be saved. Try again.")).toBe(500)
    expect(shareErrorStatus("Enter the year you graduated high school.")).toBe(400)
    const limited = shareCreateLimitedMessage(90)
    expect(shareErrorStatus(limited)).toBe(429)
    expect(shareFailureHeaders(429, 90)).toEqual({ "Retry-After": "90", "Cache-Control": "no-store" })
    expect(shareFailureHeaders(400)).toBeUndefined()
  })

  it("builds playlist JSON with catalog matches, artwork, and the iTunes line", () => {
    const full = buildPlaylist({ graduationYear: 1984, genres: [], hits: songs })
    const dance = buildPlaylist({ graduationYear: 1984, genres: ["dance"], hits: songs, title: full.title })
    const payload = buildPlaylistPayload({
      visible: dance,
      artworkSource: full,
      matches: [
        {
          key: "song:1",
          title: "Too Much Heaven",
          artist: "Bee Gees",
          catalogId: "111",
          artworkUrl: "https://is1-ssl.mzstatic.com/image/thumb/a/100x100bb.jpg",
          artworkLargeUrl: "https://is1-ssl.mzstatic.com/image/thumb/a/800x800bb.jpg",
          previewUrl: "https://audio-ssl.itunes.apple.com/preview.m4a",
          url: "https://music.apple.com/us/song/too-much-heaven/111",
        },
      ],
      unmatched: [{ key: "song:3", title: "I Will Survive", artist: "Gloria Gaynor", reason: "not_in_catalog" }],
      limits: { min: 1955, max: 2026 },
      limitsError: null,
      share: { id: "hvNkUNU7FX", url: "https://www.playlisttimemachine.com/p/hvNkUNU7FX?collage=1#year-1984" },
      recipientYear: 1984,
      filterMessage: null,
    })

    expect(payload.courtesy).toBe(ITUNES_PREVIEW_ATTRIBUTION)
    expect(payload.playlist.hits.map((song) => song.title)).toEqual(["I Will Survive"])
    expect(payload.playlist.hits[0]?.matchReason).toBe("not_in_catalog")
    expect(payload.playlist.hits[0]?.appleMusicUrl).toContain("music.apple.com")
    expect(payload.artwork?.presentsAs).toBe("playlist-artwork")
    expect(payload.artwork?.plan.tiles).toHaveLength(3)
    expect(payload.artwork?.plan.format).toBe("square")
    expect(payload.artwork?.headline).toContain("Class of 1984")
    expect(payload.artwork?.link).toBe("https://www.playlisttimemachine.com/p/hvNkUNU7FX")
    expect(payload.artwork?.mark).toBe("Playlist Time Machine")
    expect(payload.library.name).toBe("Class of 1984 · Playlist Time Machine")
    expect(payload.library.description).toContain("https://www.playlisttimemachine.com/p/hvNkUNU7FX")
    expect(payload.share?.message).toContain("https://www.playlisttimemachine.com/p/hvNkUNU7FX")
    expect(payload.share?.message).toContain("utm_source=native")
    expect(payload.recipient?.question).toBe("What was your graduation year?")
    expect(availableGenres(full.hits)).toEqual(["Dance", "Rock", "Soul"])
    expect(JSON.stringify(payload).toLowerCase()).not.toContain("billboard")
  })

  it("writes the share message from the canonical playlist link", () => {
    const share = playlistShareCopy("hvNkUNU7FX", "https://www.playlisttimemachine.com/p/hvNkUNU7FX", 1984)
    expect(share.url).toBe("https://www.playlisttimemachine.com/p/hvNkUNU7FX")
    expect(share.subject).toBe("My Class of 1984 playlist")
    expect(share.message.startsWith("My Class of 1984 playlist:")).toBe(true)
  })

  it("publishes the Apple team id on the playlist path only", () => {
    const file = appleAppSiteAssociation()
    const encoded = JSON.stringify(file)
    expect(encoded).toContain(`${APPLE_TEAM_ID}.${IOS_BUNDLE_ID}`)
    expect(encoded).toContain("WS2R3SYV4W.com.abeba.playlisttimemachine")
    expect(encoded).not.toContain("REPLACE_WITH_APPLE_TEAM_ID")
    expect(file.applinks.details[0]?.components.map((component) => component["/"])).toEqual([
      "/p/*/opengraph-image",
      "/p/*",
    ])
    expect(file.applinks.details[0]?.components[0]?.exclude).toBe(true)
    expect(encoded.toLowerCase()).not.toContain("billboard")
  })

  it("keeps the iOS project on the same bundle id, host, and attribution", () => {
    const project = readFileSync("ios/project.yml", "utf8")
    const entitlements = readFileSync("ios/PlaylistTimeMachine/PlaylistTimeMachine.entitlements", "utf8")
    const info = readFileSync("ios/PlaylistTimeMachine/Info.plist", "utf8")
    const swift = readTree("ios")
    expect(project).toContain("com.abeba.playlisttimemachine")
    expect(project).toContain('IPHONEOS_DEPLOYMENT_TARGET: "16.0"')
    expect(project).toContain('TARGETED_DEVICE_FAMILY: "1,2"')
    expect(readFileSync("ios/PlaylistTimeMachineUITests/ScreenshotTests.swift", "utf8")).toContain("ptm-shot-config.json")
    const metadata = readFileSync(".github/scripts/asc_metadata.py", "utf8")
    expect(metadata).toContain("APP_IPHONE_DUO")
    expect(metadata).toContain("APP_IPAD_PRO_129")
    expect(metadata).toContain("(1398, 2034)")
    expect(metadata).toContain("(2064, 2752)")
    expect(metadata.toLowerCase()).not.toContain("billboard")
    expect(project).toContain("DEVELOPMENT_TEAM: WS2R3SYV4W")
    expect(entitlements).toContain("applinks:www.playlisttimemachine.com")
    expect(entitlements).toContain("applinks:playlisttimemachine.com")
    expect(entitlements).not.toContain("musickit")
    expect(info).toContain("<string>Playlist TM</string>")
    expect(info).toContain("Playlist Time Machine")
    expect(info).toContain("NSAppleMusicUsageDescription")
    expect(info).toMatch(/<key>ITSAppUsesNonExemptEncryption<\/key>\s*<false\/>/)
    const iconDir = "ios/PlaylistTimeMachine/Assets.xcassets/AppIcon.appiconset"
    const contents = readFileSync(`${iconDir}/Contents.json`, "utf8")
    expect(contents).toContain('"value" : "dark"')
    expect(contents).toContain('"value" : "tinted"')
    for (const name of ["AppIcon.png", "AppIcon-dark.png", "AppIcon-tinted.png"]) {
      const icon = readFileSync(`${iconDir}/${name}`)
      expect(icon.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a")
      expect(icon.readUInt32BE(16)).toBe(1024)
      expect(icon.readUInt32BE(20)).toBe(1024)
      expect(icon[25]).toBe(2)
      expect(icon.includes(Buffer.from("tRNS"))).toBe(false)
    }
    expect(swift).toContain(ITUNES_PREVIEW_ATTRIBUTION)
    expect(swift.toLowerCase()).not.toContain("billboard")
    expect(readFileSync("lib/playlist/ios-api.ts", "utf8").toLowerCase()).not.toContain("billboard")
    expect(readTree("app/api").toLowerCase()).not.toContain("billboard")
  })

  it("keeps the Apple Music save alive after the sheet closes", () => {
    const sheet = readFileSync("ios/PlaylistTimeMachine/SaveToAppleMusicSheet.swift", "utf8")
    const model = readFileSync("ios/PlaylistTimeMachine/AppModel.swift", "utf8")
    const saver = readFileSync("ios/PlaylistTimeMachine/LibrarySaver.swift", "utf8")
    expect(sheet).toContain("Saving to Apple Music.  Please close (X).")
    expect(sheet).not.toContain("ProgressView")
    expect(sheet).not.toContain("please wait")
    expect(sheet).not.toContain("Task.sleep")
    expect(sheet).not.toContain("appleMusicSaveTask")
    expect(sheet).toContain("model.beginAppleMusicSave(playback: playback)")
    expect(model).toContain("Task.detached")
    expect(model).toContain("appleMusicSaveTask = Task.detached")
    expect(model).not.toContain("appleMusicSaveTask?.cancel")
    expect(model).toContain('showToast("Saved to Apple Music", isError: false)')
    expect(saver).toContain("MusicLibrary.shared.edit(playlist, items: songs)")
    expect(saver).not.toContain("for song in songs.dropFirst(100)")
  })

  it("dismisses the saved playlist prompt instead of leaving it up", () => {
    const model = readFileSync("ios/PlaylistTimeMachine/AppModel.swift", "utf8")
    const view = readFileSync("ios/PlaylistTimeMachine/PlaylistView.swift", "utf8")
    expect(view).toContain("Open the saved playlist")
    expect(view).toContain("dismissSavedPrompt()")
    expect(view).toContain("DragGesture")
    expect(model).toContain("savedURL = nil")
    expect(model).toContain("4_000_000_000")
    expect(model).toContain("clearTransientNotices()")
    const apply = model.slice(model.indexOf("private func apply"))
    expect(apply).toContain("clearTransientNotices()")
    const back = model.slice(model.indexOf("func backToYear"))
    expect(back).toContain("clearTransientNotices()")
  })
})
