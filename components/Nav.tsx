"use client"

import Link from "next/link"
import { useSyncExternalStore } from "react"
import { usePathname } from "next/navigation"

const HIDDEN_ON = ["/auth/signin", "/auth/signup", "/onboarding"]

const NAV_ITEMS = [
  {
    href: "/",
    label: "Home",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
        <path d="M9 21V12h6v9" />
      </svg>
    ),
  },
  {
    href: "/log",
    label: "Log",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="M12 8v8M8 12h8" />
      </svg>
    ),
  },
  {
    href: "/progress",
    label: "Progress",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    href: "/program",
    label: "Program",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: "/profile",
    label: "Profile",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </svg>
    ),
  },
]

export default function Nav() {
  const pathname = usePathname()
  const isEmbedded = useSyncExternalStore(
    () => () => undefined,
    () => {
      try {
        return window.self !== window.top
      } catch {
        return true
      }
    },
    () => false,
  )

  if (isEmbedded || HIDDEN_ON.some((route) => pathname.startsWith(route))) {
    return null
  }

  return (
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
  )
}