import "server-only"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

function client(key: string | undefined): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url || !key) return null
  try {
    return createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  } catch {
    return null
  }
}

/** Public anon key. Chart reads and the share functions use this. */
export function createAnonClient(): SupabaseClient | null {
  return client(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

export function createReadClient(): SupabaseClient | null {
  return createAnonClient()
}

/**
 * Service role. Share creation calls this only when `create_shared_playlist`
 * is not installed yet, so the website can be deployed before that migration.
 */
export function createWriteClient(): SupabaseClient | null {
  return client(process.env.SUPABASE_SERVICE_ROLE_KEY)
}
