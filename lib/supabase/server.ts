import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

/**
 * Server-side Supabase client.
 * Use this in:
 *   - Server Components (app/page.tsx, app/layout.tsx etc.)
 *   - API Route Handlers (app/api/[...]/route.ts)
 *   - Server Actions
 *
 * Must be called inside a request context (not at module level).
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // setAll is called from a Server Component where cookies
            // can't be mutated. The middleware will handle session refresh.
          }
        },
      },
    }
  )
}

/**
 * Helper: get the current authenticated user on the server.
 * Returns null if not logged in.
 *
 * Usage in a server component:
 *   const user = await getUser()
 *   if (!user) redirect('/auth/signin')
 */
export async function getUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) return null
  return user
}

/**
 * Helper: get the current user's profile row from the profiles table.
 * Returns null if not logged in or profile doesn't exist.
 */
export async function getUserProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  return profile
}