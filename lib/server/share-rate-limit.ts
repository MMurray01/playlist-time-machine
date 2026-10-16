import "server-only"

import { randomUUID } from "node:crypto"
import {
  MemoryShareLimiter,
  SHARE_CREATE_WINDOW_MS,
  SHARE_CREATES_PER_WINDOW,
  parseUpstashLimitResult,
  readUpstashRestEnv,
  type ShareLimitDecision,
} from "@/lib/playlist/share-rate-limit"

const memory = new MemoryShareLimiter()
let warnedMissingStore = false

/**
 * Atomic sliding window. Same rule as decideSlidingWindow: a hit older than
 * the window no longer counts, and a full window does not record another hit.
 * Returns {allowed, count, retryAfterSeconds}.
 */
const SLIDING_WINDOW_SCRIPT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local member = ARGV[4]
if (not now) or (not window) or (not limit) or (not member) or member == "" then
  return {0, 0, 60}
end
redis.call("ZREMRANGEBYSCORE", key, "-inf", now - window)
local count = redis.call("ZCARD", key)
if count >= limit then
  local oldest = redis.call("ZRANGE", key, 0, 0, "WITHSCORES")
  local retryMs = window
  local oldestScore = oldest[2] and tonumber(oldest[2]) or nil
  if oldestScore then
    retryMs = oldestScore + window - now
  end
  if retryMs < 1000 then
    retryMs = 1000
  end
  redis.call("PEXPIRE", key, window)
  return {0, count, math.ceil(retryMs / 1000)}
end
redis.call("ZADD", key, now, member)
redis.call("PEXPIRE", key, window)
return {1, count + 1, 0}
`

export async function limitShareCreate(ip: string, now = Date.now()): Promise<ShareLimitDecision> {
  const key = ip || "unknown"
  const remote = readUpstashRestEnv(process.env)
  if (!remote) {
    noteMissingSharedStore()
    return memory.consume(key, now)
  }
  try {
    return await evalSlidingWindow(remote.url, remote.token, key, now)
  } catch {
    console.error("share create rate limit store failed")
    return memory.consume(key, now)
  }
}

async function evalSlidingWindow(url: string, token: string, ip: string, now: number): Promise<ShareLimitDecision> {
  const response = await fetch(url, {
    method: "POST",
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(2000),
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      "EVAL",
      SLIDING_WINDOW_SCRIPT,
      1,
      `ptm:share-create:v1:${ip}`,
      String(now),
      String(SHARE_CREATE_WINDOW_MS),
      String(SHARE_CREATES_PER_WINDOW),
      `${now}:${randomUUID()}`,
    ]),
  })
  if (!response.ok) throw new Error("share rate limit store status")
  const decision = parseUpstashLimitResult(await response.json())
  if (!decision) throw new Error("share rate limit store payload")
  return decision
}

function noteMissingSharedStore(): void {
  if (warnedMissingStore || process.env.VERCEL_ENV !== "production") return
  warnedMissingStore = true
  console.error(
    "Share creation is limited inside this server process only. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN so the limit holds across instances.",
  )
}
