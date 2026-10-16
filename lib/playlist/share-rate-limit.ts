/** New share links allowed from one IP inside SHARE_CREATE_WINDOW_MS. */
export const SHARE_CREATES_PER_WINDOW = 10

/** One hour. A person saving or resharing a class playlist stays under this. */
export const SHARE_CREATE_WINDOW_MS = 60 * 60 * 1000

const IPV4 = /^(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}$/
const IPV6 = /^[0-9a-f:.]{2,64}$/i

export type ShareLimitDecision = { allowed: true } | { allowed: false; retryAfterSeconds: number }

export type UpstashRestAuth = { url: string; token: string }

type HeaderSource = { get(name: string): string | null }

/**
 * Vercel sets x-real-ip to the connecting client and overwrites x-forwarded-for.
 * Anything that is not an IP shares one bucket so a missing address is not unlimited.
 */
export function clientAddress(headerList: HeaderSource): string {
  const real = normalizeIp(headerList.get("x-real-ip"))
  if (real) return real
  const forwarded = headerList.get("x-forwarded-for")
  if (forwarded) {
    const first = normalizeIp(forwarded.split(",")[0] ?? "")
    if (first) return first
  }
  return "unknown"
}

export function shareCreateLimitedMessage(retryAfterSeconds: number): string {
  const seconds = Math.max(1, Math.ceil(retryAfterSeconds))
  if (seconds < 60) {
    const unit = seconds === 1 ? "second" : "seconds"
    return `Too many share links from this network. Try again in ${seconds} ${unit}.`
  }
  const minutes = Math.max(1, Math.ceil(seconds / 60))
  const unit = minutes === 1 ? "minute" : "minutes"
  return `Too many share links from this network. Try again in ${minutes} ${unit}.`
}

/**
 * Drop timestamps at or before the cutoff, then allow the new hit when the
 * window still has room. The Redis script in lib/server/share-rate-limit.ts
 * follows the same rule.
 */
export function decideSlidingWindow(
  hits: readonly number[],
  now: number,
  limit: number,
  windowMs: number,
): { decision: ShareLimitDecision; next: number[] } {
  const cutoff = now - windowMs
  const next = hits.filter((stamp) => stamp > cutoff).sort((left, right) => left - right)
  if (next.length >= limit) {
    const oldest = next[0] ?? now
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000))
    return { decision: { allowed: false, retryAfterSeconds }, next }
  }
  next.push(now)
  return { decision: { allowed: true }, next }
}

export class MemoryShareLimiter {
  private readonly hits = new Map<string, number[]>()

  constructor(
    private readonly limit = SHARE_CREATES_PER_WINDOW,
    private readonly windowMs = SHARE_CREATE_WINDOW_MS,
    private readonly maxKeys = 5000,
  ) {}

  consume(key: string, now: number): ShareLimitDecision {
    const prior = this.hits.get(key) ?? []
    const { decision, next } = decideSlidingWindow(prior, now, this.limit, this.windowMs)
    if (next.length === 0) this.hits.delete(key)
    else this.hits.set(key, next)
    this.prune(key)
    return decision
  }

  reset(): void {
    this.hits.clear()
  }

  private prune(keep: string): void {
    if (this.hits.size <= this.maxKeys) return
    for (const key of this.hits.keys()) {
      if (this.hits.size <= this.maxKeys) return
      if (key !== keep) this.hits.delete(key)
    }
  }
}

/**
 * The share limit runs only when both Upstash variables are set.
 * A KV REST pair is not a substitute, and a missing pair means no limit.
 */
export function readUpstashRestEnv(env: Record<string, string | undefined>): UpstashRestAuth | null {
  return restPair(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN)
}

export function parseUpstashLimitResult(payload: unknown): ShareLimitDecision | null {
  if (!payload || typeof payload !== "object") return null
  const record = payload as { result?: unknown; error?: unknown }
  if (record.error) return null
  if (!Array.isArray(record.result) || record.result.length < 3) return null
  const flag = Number(record.result[0])
  const retry = Number(record.result[2])
  if (flag === 1) return { allowed: true }
  if (flag === 0 && Number.isFinite(retry)) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(retry)) }
  }
  return null
}

function restPair(url: string | undefined, token: string | undefined): UpstashRestAuth | null {
  const trimmedUrl = url?.trim()
  const trimmedToken = token?.trim()
  if (!trimmedUrl || !trimmedToken) return null
  return { url: trimmedUrl.replace(/\/$/, ""), token: trimmedToken }
}

function normalizeIp(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (IPV4.test(trimmed)) return trimmed
  if (trimmed.includes(":") && !trimmed.includes("/") && IPV6.test(trimmed)) return trimmed.toLowerCase()
  return null
}
