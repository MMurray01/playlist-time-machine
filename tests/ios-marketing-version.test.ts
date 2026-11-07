import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const project = readFileSync("ios/project.yml", "utf8")
const info = readFileSync("ios/PlaylistTimeMachine/Info.plist", "utf8")
const workflow = readFileSync(".github/workflows/testflight.yml", "utf8")

function marketingVersions(source: string): string[] {
  return [...source.matchAll(/MARKETING_VERSION:\s*"([^"]+)"/g)].map((match) => match[1])
}

/**
 * The archive does not pass MARKETING_VERSION. Info.plist expands
 * $(MARKETING_VERSION) from the XcodeGen project, and the upload script reads
 * CFBundleShortVersionString from that built IPA.
 */
function archivedShortVersion(projectSource: string, plist: string): string {
  const versions = marketingVersions(projectSource)
  const marker = plist.match(/<key>CFBundleShortVersionString<\/key>\s*<string>([^<]+)<\/string>/)
  if (!marker) throw new Error("CFBundleShortVersionString is missing")
  if (marker[1] !== "$(MARKETING_VERSION)") {
    throw new Error(`short version is hardcoded as ${marker[1]}`)
  }
  if (new Set(versions).size !== 1) {
    throw new Error(`marketing versions disagree: ${versions.join(", ")}`)
  }
  return versions[0]
}

describe("iOS marketing version", () => {
  it("ships 1.0.1 through the archive plist", () => {
    const versions = marketingVersions(project)
    expect(versions).toEqual(["1.0.1", "1.0.1"])
    expect(archivedShortVersion(project, info)).toBe("1.0.1")
    expect(archivedShortVersion(project, info)).not.toBe("1.0")
  })

  it("keeps the TestFlight build number as the workflow run number", () => {
    expect(workflow).toContain('CURRENT_PROJECT_VERSION="${{ github.run_number }}"')
    expect(workflow).not.toContain("MARKETING_VERSION")
    expect(project).toContain('CURRENT_PROJECT_VERSION: "1"')
  })
})
