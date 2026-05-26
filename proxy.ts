import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

// ─────────────────────────────────────────────
//  Routes that don't require authentication
// ─────────────────────────────────────────────

const PUBLIC_ROUTES = [
  "/auth/signin",
  "/auth/signup",
]

// ─────────────────────────────────────────────
//  Routes that logged-in users shouldn't visit
//  (redirect them to home instead)
// ─────────────────────────────────────────────

const AUTH_ROUTES = [
  "/auth/signin",
  "/auth/signup",
]

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Apply cookies to both the request and response
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Do not add any logic between createServerClient and
  // supabase.auth.getUser(). The session refresh only works when
  // getUser() is called immediately after the client is created.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // ── Not logged in → redirect to sign-in ──────────────────────────
  if (!user && !PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/signin"
    // Preserve the original destination so we can redirect back after login
    url.searchParams.set("redirectTo", pathname)
    return NextResponse.redirect(url)
  }

  // ── Logged in → redirect away from auth pages ─────────────────────
  if (user && AUTH_ROUTES.some((route) => pathname.startsWith(route))) {
    const url = request.nextUrl.clone()
    url.pathname = "/"
    return NextResponse.redirect(url)
  }

  // ── Logged in but hasn't confirmed program → send to onboarding ───
  // (Skip if already on /onboarding to avoid redirect loop)
  if (
    user &&
    !pathname.startsWith("/onboarding") &&
    !pathname.startsWith("/program") &&
    !pathname.startsWith("/profile") &&
    !pathname.startsWith("/auth") &&
    !pathname.startsWith("/api")
  ) {
    // We check program_confirmed_at in the profile.
    // If null → user is still in onboarding.
    // Note: we do a lightweight check here. Full profile data
    // is fetched in the onboarding page itself.
    const { data: profile } = await supabase
      .from("profiles")
      .select("program_confirmed_at, role")
      .eq("id", user.id)
      .single()

    // Only redirect to onboarding if profile exists and isn't confirmed yet.
    // Admins skip onboarding — their program is already set.
    if (
      profile &&
      !profile.program_confirmed_at &&
      profile.role !== "admin"
    ) {
      const url = request.nextUrl.clone()
      url.pathname = "/onboarding"
      return NextResponse.redirect(url)
    }
  }

  // Session cookies have been refreshed — return the updated response
  return supabaseResponse
}

// ─────────────────────────────────────────────
//  Matcher — which routes the proxy runs on.
//  Excludes static files, images, and favicon.
// ─────────────────────────────────────────────

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     * - Public files in /public (icons, manifest, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|icons/|manifest.json|sitemap.xml|robots.txt).*)",
  ],
}