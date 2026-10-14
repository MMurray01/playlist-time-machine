import { describe, expect, it } from "vitest"
import { readResultsView, writeResultsView } from "@/lib/playlist/browse"

function memory() {
  const data = new Map<string, string>()
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value)
    },
  }
}

describe("results view preference", () => {
  it("defaults to Cover Flow", () => {
    expect(readResultsView(null)).toBe("flow")
    expect(readResultsView(memory())).toBe("flow")
  })

  it("remembers a list choice", () => {
    const store = memory()
    writeResultsView(store, "list")
    expect(readResultsView(store)).toBe("list")
    writeResultsView(store, "flow")
    expect(readResultsView(store)).toBe("flow")
  })
})
