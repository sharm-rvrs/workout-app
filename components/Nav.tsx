"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, useSyncExternalStore } from "react"
import { usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

// ─────────────────────────────────────────────
//  Routes where the nav should NOT appear
// ─────────────────────────────────────────────

const HIDDEN_ON = ["/auth/signin", "/auth/signup", "/onboarding"]

// ─────────────────────────────────────────────
//  Nav items
// ─────────────────────────────────────────────

const NAV_ITEMS = [
  {
    href: "/",
    label: "Home",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={active ? 2 : 1.5}
        strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
        <path d="M9 21V12h6v9" />
      </svg>
    ),
  },
  {
    href: "/log",
    label: "Log",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={active ? 2 : 1.5}
        strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="M12 8v8M8 12h8" />
      </svg>
    ),
  },
  {
    href: "/progress",
    label: "Progress",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={active ? 2 : 1.5}
        strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    href: "/program",
    label: "Program",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={active ? 2 : 1.5}
        strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: "/chat",
    label: "AI Chat",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={active ? 2 : 1.5}
        strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        <circle cx="9"  cy="10" r="1" fill="currentColor" stroke="none" />
        <circle cx="12" cy="10" r="1" fill="currentColor" stroke="none" />
        <circle cx="15" cy="10" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
]

// ─────────────────────────────────────────────
//  Component
// ─────────────────────────────────────────────

export default function Nav() {
  const pathname = usePathname()
  const [avatarLabel, setAvatarLabel] = useState("?")
  const isEmbedded = useSyncExternalStore(
    () => () => undefined,
    () => {
      try {
        return window.self !== window.top
      } catch {
        // Cross-origin frame access can throw; treat it as embedded.
        return true
      }
    },
    () => false,
  )

  useEffect(() => {
    let cancelled = false

    async function loadProfileBadge() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        if (!cancelled) setAvatarLabel("?")
        return
      }

      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single()

      const fullName = (data?.full_name as string | undefined) ?? ""
      const parts = fullName
        .trim()
        .split(/\s+/)
        .filter(Boolean)

      let label = ""
      if (parts.length >= 2) {
        label = `${parts[0][0]}${parts[1][0]}`
      } else if (parts.length === 1) {
        label = parts[0].slice(0, 2)
      } else {
        label = user.email?.slice(0, 2) ?? "?"
      }

      if (!cancelled) {
        setAvatarLabel(label.toUpperCase())
      }
    }

    void loadProfileBadge()
    return () => {
      cancelled = true
    }
  }, [])

  const profileActive = useMemo(() => pathname.startsWith("/profile"), [pathname])

  // Hide nav on auth + onboarding pages and embedded contexts.
  if (isEmbedded || HIDDEN_ON.some((route) => pathname.startsWith(route))) {
    return null
  }

  return (
    <>
      <Link
        href="/profile"
        aria-current={profileActive ? "page" : undefined}
        aria-label="Profile"
        style={{
          position: "fixed",
          top: "calc(env(safe-area-inset-top) + 8px)",
          right: 12,
          width: "clamp(32px, 9vw, 38px)",
          height: "clamp(32px, 9vw, 38px)",
          borderRadius: "50%",
          background: profileActive ? "var(--accent-dim)" : "rgba(18,18,18,0.9)",
          border: `0.5px solid ${profileActive ? "var(--accent-border)" : "var(--border-default)"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "clamp(10px, 2.6vw, 12px)",
          fontWeight: 600,
          color: profileActive ? "var(--accent)" : "var(--text-secondary)",
          textDecoration: "none",
          zIndex: 60,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        {avatarLabel}
      </Link>

      <nav
        aria-label="Main navigation"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: "var(--nav-height)",
          background: "rgba(13,13,13,0.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderTop: "0.5px solid var(--border-subtle)",
          display: "flex",
          zIndex: 50,
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
                color: active ? "var(--accent)" : "var(--text-muted)",
                textDecoration: "none",
                transition: "color 0.15s",
                position: "relative",
                paddingBottom: 3,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: 0,
                  width: active ? 28 : 0,
                  height: 2,
                  background: "var(--accent)",
                  borderRadius: "0 0 3px 3px",
                  transition: "width 0.25s cubic-bezier(0.34,1.56,0.64,1)",
                }}
              />
              {icon(active)}
              <span
                style={{
                  fontSize: "clamp(8.5px, 2.2vw, 10px)",
                  fontWeight: active ? 500 : 400,
                  whiteSpace: "nowrap",
                  letterSpacing: "0.01em",
                }}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}