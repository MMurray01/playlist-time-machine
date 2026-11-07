import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const source = readFileSync("ios/PlaylistTimeMachine/AppleMusicSaveSession.swift", "utf8")

function extractBody(name: string): string {
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

function parameters(name: string): string {
  const start = source.indexOf(`static func ${name}(`)
  const open = source.indexOf("(", start)
  const close = source.indexOf(")", open)
  return source
    .slice(open + 1, close)
    .split(",")
    .map((part) => part.trim().split(":")[0].trim())
    .filter((name) => name.length > 0 && name !== "_")
    .join(", ")
}

function loadSession() {
  const numbers = new Map<string, string>()
  for (const match of source.matchAll(/static let (\w+) = (-?\d+)/g)) {
    numbers.set(match[1], match[2])
  }
  const names = [
    "begin",
    "release",
    "isCurrent",
    "nextTaskTicket",
    "clearsWorking",
    "kept",
    "clearsSaveChrome",
    "replacesPlaylistError",
  ]
  const parts = names.map((name) => {
    let body = extractBody(name)
    for (const [key, value] of [...numbers.entries()].sort((a, b) => b[0].length - a[0].length)) {
      body = body.replace(new RegExp(`\\b${key}\\b`, "g"), value)
    }
    body = body
      .replaceAll("== true", "=== true")
      .replaceAll("== false", "=== false")
      .replace(/\b[A-Za-z_][A-Za-z0-9_]*:\s+/g, "")
      .replace(/if\s+([^{]+?)\s*\{/g, "if ($1) {")
    return `function ${name}(${parameters(name)}) {${body}}`
  })
  const script = `${parts.join("\n")}; return { begin, release, isCurrent, nextTaskTicket, clearsWorking, kept, clearsSaveChrome, replacesPlaylistError }`
  try {
    return new Function(script)() as {
      begin: (taskTicket: number, generation: number) => number
      release: () => number
      isCurrent: (taskTicket: number, ticket: number, generation: number) => boolean
      nextTaskTicket: (taskTicket: number, ticket: number, generation: number) => number
      clearsWorking: (taskTicket: number, ticket: number, generation: number) => boolean
      kept: (value: boolean, replacedDocument: boolean) => boolean
      clearsSaveChrome: (replacedDocument: boolean) => boolean
      replacesPlaylistError: (explicit: boolean, sameDocument: boolean) => boolean
    }
  } catch (error) {
    throw new Error(`${error instanceof Error ? error.message : error}\n${script}`)
  }
}

/** The behavior under review: every completion clears the task and the busy flag. */
function legacyFinish(): { taskTicket: number; clearWorking: boolean } {
  return { taskTicket: -1, clearWorking: true }
}

/** The behavior under review: every share failure replaces playlistError. */
function legacyShareFailureReplaces(): boolean {
  return true
}

describe("Apple Music save session", () => {
  const session = loadSession()
  const saveError = "An Apple Music subscription is required to add these songs to your library. Nothing was saved."

  it("ignores a stale save and keeps the newer task busy", () => {
    const idle = -1
    const first = session.begin(idle, 1)
    expect(session.begin(first, 1)).toBe(first)

    const released = session.release()
    expect(released).toBe(idle)
    const second = session.begin(released, 2)
    expect(second).toBe(2)

    const staleTicket = session.nextTaskTicket(second, first, 2)
    const staleClears = session.clearsWorking(second, first, 2)
    expect(staleTicket).toBe(second)
    expect(staleClears).toBe(false)
    expect(session.isCurrent(second, first, 2)).toBe(false)
    expect(staleTicket).not.toBe(legacyFinish().taskTicket)
    expect(staleClears).not.toBe(legacyFinish().clearWorking)

    expect(session.clearsWorking(second, second, 2)).toBe(true)
    expect(session.nextTaskTicket(second, second, 2)).toBe(idle)
  })

  it("still applies a save that finishes on the same playlist", () => {
    const ticket = session.begin(-1, 4)
    expect(session.isCurrent(ticket, ticket, 4)).toBe(true)
    expect(session.clearsWorking(ticket, ticket, 4)).toBe(true)
    expect(session.nextTaskTicket(ticket, ticket, 4)).toBe(-1)
    expect(session.kept(true, false)).toBe(true)
    expect(session.clearsSaveChrome(false)).toBe(false)
  })

  it("drops partial and offer state when the document is replaced", () => {
    expect(session.kept(true, true)).toBe(false)
    expect(session.clearsSaveChrome(true)).toBe(true)
    const inherited = session.kept(true, false)
    const replaced = session.kept(true, true)
    expect(inherited).toBe(true)
    expect(replaced).toBe(false)
    expect(replaced).not.toBe(inherited)
  })

  it("keeps the save error when a background share fails", () => {
    let shown = saveError
    if (session.replacesPlaylistError(false, true)) shown = "The share link could not be saved."
    expect(shown).toBe(saveError)
    expect(shown).not.toContain("share link")
    expect(session.replacesPlaylistError(false, true)).toBe(false)
    expect(session.replacesPlaylistError(true, false)).toBe(false)
    expect(session.replacesPlaylistError(true, true)).toBe(true)
    expect(session.replacesPlaylistError(false, true)).not.toBe(legacyShareFailureReplaces())

    let explicit = saveError
    if (session.replacesPlaylistError(true, true)) explicit = "The share link could not be saved."
    expect(explicit).toBe("The share link could not be saved.")
  })
})
