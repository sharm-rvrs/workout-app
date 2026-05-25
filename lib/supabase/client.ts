import { createBrowserClient } from "@supabase/ssr"

/**
 * Browser (client component) Supabase client.
 * Use this in any "use client" component or hook.
 *
 * Creates a new instance on every call — safe because
 * @supabase/ssr de-duplicates under the hood.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}