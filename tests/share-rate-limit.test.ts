import { describe, expect, it } from "vitest"
import {
  MemoryShareLimiter,
  SHARE_CREATE_WINDOW_MS,
  SHARE_CREATES_PER_WINDOW,
  clientAddress,
  parseUpstashLimitResult,
  readUpstashRestEnv,
  shareCreateLimitedMessage,
} from "@/lib/playlist/share-rate-limit"

function headerList(input: Record<string, string>) {
  return { get: (name: string) => input[name] ?? null }
}

describe("share create rate limit", () => {
  it("allows 10 creates from one IP in an hour and blocks the next", () => {
    expect(SHARE_CREATES_PER_WINDOW).toBe(10)
    expect(SHARE_CREATE_WINDOW_MS).toBe(60 * 60 * 1000)
    const limiter = new MemoryShareLimiter()
    const now = 1_700_000_000_000
    for (let index = 0; index < SHARE_CREATES_PER_WINDOW; index += 1) {
      expect(limiter.consume("203.0.113.8", now).allowed).toBe(true)
    }
    expect(limiter.consume("203.0.113.8", now)).toEqual({ allowed: false, retryAfterSeconds: 3600 })
    expect(limiter.consume("203.0.113.9", now).allowed).toBe(true)
    expect(shareCreateLimitedMessage(3600)).toBe(
      "Too many share links from this network. Try again in 60 minutes.",
    )
  })

  it("opens a slot when the oldest create leaves the window", () => {
    const limiter = new MemoryShareLimiter(3, 1000)
    expect(limiter.consume("a", 0).allowed).toBe(true)
    expect(limiter.consume("a", 10).allowed).toBe(true)
    expect(limiter.consume("a", 20).allowed).toBe(true)
    const blocked = limiter.consume("a", 20)
    expect(blocked).toEqual({ allowed: false, retryAfterSeconds: 1 })
    expect(limiter.consume("a", 1000).allowed).toBe(true)
    expect(limiter.consume("a", 1000).allowed).toBe(false)
    expect(shareCreateLimitedMessage(45)).toBe("Too many share links from this network. Try again in 45 seconds.")
    expect(shareCreateLimitedMessage(61)).toBe("Too many share links from this network. Try again in 2 minutes.")
  })

  it("reads the client IP and ignores a value that is not an address", () => {
    expect(clientAddress(headerList({ "x-real-ip": "203.0.113.8", "x-forwarded-for": "198.51.100.2" }))).toBe(
      "203.0.113.8",
    )
    expect(clientAddress(headerList({ "x-forwarded-for": "198.51.100.2, 10.0.0.1" }))).toBe("198.51.100.2")
    expect(clientAddress(headerList({ "x-real-ip": "2001:db8::1" }))).toBe("2001:db8::1")
    expect(clientAddress(headerList({ "x-real-ip": "not-an-ip", "x-forwarded-for": "999.1.1.1" }))).toBe("unknown")
    expect(clientAddress(headerList({}))).toBe("unknown")
  })

  it("reads an Upstash REST pair only when both variables are set", () => {
    expect(readUpstashRestEnv({})).toBeNull()
    expect(
      readUpstashRestEnv({
        UPSTASH_REDIS_REST_URL: "https://example.upstash.io/",
        UPSTASH_REDIS_REST_TOKEN: "token",
        KV_REST_API_URL: "https://kv.example",
        KV_REST_API_TOKEN: "kv",
      }),
    ).toEqual({ url: "https://example.upstash.io", token: "token" })
    expect(readUpstashRestEnv({ KV_REST_API_URL: "https://kv.example/", KV_REST_API_TOKEN: "kv" })).toBeNull()
    expect(readUpstashRestEnv({ UPSTASH_REDIS_REST_URL: "https://example.upstash.io" })).toBeNull()
    expect(readUpstashRestEnv({ UPSTASH_REDIS_REST_TOKEN: "token" })).toBeNull()
    expect(parseUpstashLimitResult({ result: [1, 4, 0] })).toEqual({ allowed: true })
    expect(parseUpstashLimitResult({ result: [0, 10, 120] })).toEqual({
      allowed: false,
      retryAfterSeconds: 120,
    })
    expect(parseUpstashLimitResult({ result: [0, 10, 0.2] })).toEqual({
      allowed: false,
      retryAfterSeconds: 1,
    })
    expect(parseUpstashLimitResult({ error: "NOAUTH" })).toBeNull()
    expect(parseUpstashLimitResult(null)).toBeNull()
  })
})
