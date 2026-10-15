import { describe, expect, it } from "vitest"
import {
  SHARE_PAGE_REF,
  makePlaylistHref,
  recipientPrompt,
  recipientQuestion,
  recipientYearFromQuery,
} from "@/lib/share/recipient"

function expectClean(value: string) {
  expect(value).not.toContain("\u2014")
  expect(value.toLowerCase()).not.toContain("billboard")
}

describe("received playlist call to action", () => {
  it("asks for the visitor's year without a chart brand", () => {
    const prompt = recipientPrompt(1984)
    expect(prompt).toBe("Someone shared their Class of 1984 playlist with you.")
    expect(recipientQuestion()).toBe("What was your graduation year?")
    expectClean(prompt)
    expectClean(recipientQuestion())
  })

  it("sends the chosen year home with the share-page ref", () => {
    expect(makePlaylistHref(1980)).toBe("/?year=1980&ref=share-page")
    expect(SHARE_PAGE_REF).toBe("share-page")
  })

  it("auto-builds only when the link came from a shared playlist", () => {
    expect(recipientYearFromQuery("1980", "share-page")).toEqual({ year: 1980, fromSharePage: true })
    expect(recipientYearFromQuery("1980", undefined)).toEqual({ year: 1980, fromSharePage: false })
    expect(recipientYearFromQuery("nope", "share-page")).toEqual({ year: null, fromSharePage: false })
  })
})
