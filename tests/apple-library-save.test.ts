import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const policySource = readFileSync("ios/PlaylistTimeMachine/LibrarySavePolicy.swift", "utf8")
const saverSource = readFileSync("ios/PlaylistTimeMachine/LibrarySaver.swift", "utf8")
const modelSource = readFileSync("ios/PlaylistTimeMachine/AppModel.swift", "utf8")

function extractBody(source: string, name: string): string {
  const start = source.indexOf(`static func ${name}(`)
  if (start < 0) throw new Error(`missing ${name}`)
  const open = source.indexOf("{", start)
  let depth = 0
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1
    else if (source[index] === "}") {
      depth -= 1
      if (depth === 0) return source.slice(open + 1, index)
    }
  }
  throw new Error(`unclosed ${name}`)
}

function staticStrings(source: string): Map<string, string> {
  const values = new Map<string, string>()
  for (const match of source.matchAll(/static let (\w+) = "([^"]*)"/g)) {
    values.set(match[1], match[2])
  }
  return values
}

/**
 * Runs the pure Swift policy in this process. MusicKit is not available here,
 * and these functions do not use it. A body that still branches on playback
 * or swallows the subscription read fails closed.
 */
function loadPolicy(source: string) {
  const strings = [...staticStrings(source).entries()].sort((a, b) => b[0].length - a[0].length)
  const names = ["decide", "blockMessage", "keepReturnedPlaylist", "stoppedEarly", "savedNote", "successToast"]
  const parts = names.map((name) => {
    let body = extractBody(source, name)
    if (body.includes("canPlayCatalogContent") || body.includes("try?")) {
      throw new Error(`${name} still uses the playback gate or swallows the subscription read`)
    }
    for (const [key, value] of strings) {
      body = body.replace(new RegExp(`\\b${key}\\b`, "g"), JSON.stringify(value))
    }
    body = body
      .replaceAll("== nil", "== null")
      .replaceAll("return nil", "return null")
      .replaceAll("== .write", '=== "write"')
      .replaceAll("== .needsSubscription", '=== "needsSubscription"')
      .replaceAll("== .libraryUnavailable", '=== "libraryUnavailable"')
      .replaceAll("== .checkFailed", '=== "checkFailed"')
      .replace(/return \.([A-Za-z0-9_]+)/g, 'return "$1"')
      .replaceAll("== true", "=== true")
      .replaceAll("== false", "=== false")
      .replace(/\b[A-Za-z_][A-Za-z0-9_]*:\s+/g, "")
      .replace(/if\s+([^{]+?)\s*\{/g, "if ($1) {")
    return `function ${name}(${parameters(source, name)}) {${body}}`
  })
  const script = `${parts.join("\n")}; return { decide, blockMessage, keepReturnedPlaylist, stoppedEarly, savedNote, successToast }`
  let factory: () => {
    decide: (hasCloudLibraryEnabled: boolean | null, canBecomeSubscriber: boolean | null) => string
    blockMessage: (hasCloudLibraryEnabled: boolean | null, canBecomeSubscriber: boolean | null) => string | null
    keepReturnedPlaylist: (created: boolean, added: number, requested: number) => boolean
    stoppedEarly: (created: boolean, added: number, requested: number) => boolean
    savedNote: (count: number, requested: number, missingCount: number, incomplete: boolean) => string
    successToast: (incomplete: boolean) => string
  }
  try {
    factory = new Function(script) as typeof factory
  } catch (error) {
    throw new Error(`${error instanceof Error ? error.message : error}\n${script}`)
  }
  return factory() as {
    decide: (hasCloudLibraryEnabled: boolean | null, canBecomeSubscriber: boolean | null) => string
    blockMessage: (hasCloudLibraryEnabled: boolean | null, canBecomeSubscriber: boolean | null) => string | null
    keepReturnedPlaylist: (created: boolean, added: number, requested: number) => boolean
    stoppedEarly: (created: boolean, added: number, requested: number) => boolean
    savedNote: (count: number, requested: number, missingCount: number, incomplete: boolean) => string
    successToast: (incomplete: boolean) => string
  }
}

function parameters(source: string, name: string): string {
  const start = source.indexOf(`static func ${name}(`)
  const open = source.indexOf("(", start)
  const close = source.indexOf(")", open)
  return source
    .slice(open + 1, close)
    .split(",")
    .map((part) => part.trim().split(":")[0].trim().replace(/_$/, "").trim())
    .filter((name) => name.length > 0 && name !== "_")
    .join(", ")
}

/** The previous gate. A thrown read, or any pair other than "cannot play and can subscribe", continued into a write. */
function legacyGate(read: { canPlayCatalogContent: boolean; canBecomeSubscriber: boolean } | null): "needsOffer" | "write" {
  if (read && !read.canPlayCatalogContent && read.canBecomeSubscriber) return "needsOffer"
  return "write"
}

describe("Apple Music library save policy", () => {
  const policy = loadPolicy(policySource)

  it("rejects the old playback gate and a swallowed subscription read", () => {
    expect(legacyGate(null)).toBe("write")
    expect(policy.decide(null, null)).toBe("checkFailed")
    expect(policy.decide(null, true)).toBe("checkFailed")
    expect(policy.blockMessage(null, null)).toMatch(/Nothing was saved/)

    expect(legacyGate({ canPlayCatalogContent: false, canBecomeSubscriber: false })).toBe("write")
    expect(policy.decide(false, false)).toBe("libraryUnavailable")
    expect(policy.blockMessage(false, false)).toMatch(/Nothing was saved/)

    expect(legacyGate({ canPlayCatalogContent: false, canBecomeSubscriber: true })).toBe("needsOffer")
    expect(policy.decide(true, true)).toBe("write")
    expect(policy.blockMessage(true, true)).toBeNull()

    expect(policy.decide(false, true)).toBe("needsSubscription")
    const unmet = policy.blockMessage(false, true)
    expect(unmet).toMatch(/Nothing was saved/)
    expect(unmet).not.toBe(policy.successToast(false))
    expect(unmet).not.toBe(policy.successToast(true))
  })

  it("keeps a partial playlist instead of inviting another create", () => {
    expect(policy.keepReturnedPlaylist(false, 0, 12)).toBe(false)
    expect(policy.stoppedEarly(false, 0, 12)).toBe(false)
    expect(policy.keepReturnedPlaylist(true, 100, 140)).toBe(true)
    expect(policy.stoppedEarly(true, 100, 140)).toBe(true)
    expect(policy.stoppedEarly(true, 140, 140)).toBe(false)
    const note = policy.savedNote(100, 140, 2, true)
    expect(note).toBe(
      "Saved 100 of 140 songs to Apple Music. 2 songs were not in Apple Music. The playlist is already in your library. Saving again creates another copy.",
    )
    expect(policy.savedNote(10, 12, 2, false)).toBe("Saved 10 of 12 songs to Apple Music. 2 songs were not in Apple Music.")
    expect(policy.savedNote(11, 12, 1, false)).toBe("Saved 11 of 12 songs to Apple Music. 1 song was not in Apple Music.")
    expect(policy.successToast(false)).toBe("Saved to Apple Music")
    expect(policy.successToast(true)).not.toBe("Saved to Apple Music")
  })

  it("distinguishes the access check from the write in the visible labels", () => {
    expect(policySource).toContain('static let checkingLabel = "Checking Apple Music\u2026"')
    expect(policySource).toContain('static let savingLabel = "Saving to Apple Music\u2026"')
    expect(policy.decide(true, false)).toBe("write")
  })

  it("wires the save path through that policy", () => {
    const access = saverSource.slice(saverSource.indexOf("static func access"), saverSource.indexOf("static func save"))
    expect(access).toContain("try await MusicSubscription.current")
    expect(access).toContain("hasCloudLibraryEnabled: subscription.hasCloudLibraryEnabled")
    expect(access).toContain("decide(hasCloudLibraryEnabled: nil, canBecomeSubscriber: nil)")
    expect(access).not.toContain("canPlayCatalogContent")
    expect(access).not.toContain("try?")
    expect(saverSource).toContain("LibrarySavePolicy.stoppedEarly")
    expect(saverSource).toContain("LibrarySavePolicy.keepReturnedPlaylist")

    const begin = modelSource.slice(modelSource.indexOf("func beginAppleMusicSave"), modelSource.indexOf("private func markAppleMusicSaving"))
    expect(begin.indexOf("if appleMusicSaveIncomplete")).toBeLessThan(begin.indexOf("Task.detached"))
    expect(begin).toContain("LibrarySavePolicy.checkingLabel")
    expect(begin).not.toContain("ensureShare")

    const record = modelSource.slice(modelSource.indexOf("private func recordAppleMusicSave"))
    const offer = record.slice(record.indexOf("case .needsOffer"), record.indexOf("case .notAuthorized"))
    expect(offer).toContain("appleMusicSavePhase = .failed")
    expect(offer).toContain("needsSubscriptionMessage")
    expect(offer).toContain("showOffer = false")
    expect(offer).not.toContain("showToast")
    expect(offer).not.toContain(".saved")
  })
})
