"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { IcoAlert, IcoEye, IcoLoader, IcoLock, IcoMail } from "@/components/AppIcons"

// ─────────────────────────────────────────────
//  Input field component
// ─────────────────────────────────────────────

function InputField({
  label,
  type,
  value,
  onChange,
  placeholder,
  icon,
  suffix,
  error,
  autoComplete,
}: {
  label: string
  type: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  icon: React.ReactNode
  suffix?: React.ReactNode
  error?: boolean
  autoComplete?: string
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{
        fontSize: 13,
        fontWeight: 500,
        color: "var(--text-secondary)",
      }}>
        {label}
      </label>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: "var(--bg-input)",
        border: `0.5px solid ${error ? "rgba(248,113,113,0.5)" : "var(--border-default)"}`,
        borderRadius: "var(--radius-md)",
        padding: "0 14px",
        transition: "border-color 0.15s",
      }}>
        <span style={{ color: "var(--text-muted)", flexShrink: 0, display: "flex" }}>
          {icon}
        </span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          style={{
            flex: 1,
            background: "none",
            border: "none",
            color: "var(--text-primary)",
            fontSize: 14,
            fontFamily: "inherit",
            padding: "12px 0",
            outline: "none",
          }}
        />
        {suffix}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Page
// ─────────────────────────────────────────────

export default function SignInPage() {
  const router = useRouter()

  const [email, setEmail]         = useState("")
  const [password, setPassword]   = useState("")
  const [showPass, setShowPass]   = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const isValid = email.trim().length > 0 && password.length >= 6

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid || loading) return

    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    if (authError) {
      // Map Supabase error messages to user-friendly versions
      const msg = authError.message.toLowerCase()
      if (msg.includes("invalid") || msg.includes("credentials")) {
        setError("Incorrect email or password. Please try again.")
      } else if (msg.includes("email not confirmed")) {
        setError("Please check your email and confirm your account first.")
      } else if (msg.includes("too many")) {
        setError("Too many attempts. Please wait a few minutes and try again.")
      } else {
        setError(authError.message)
      }
      setLoading(false)
      return
    }

    // Success — middleware will handle redirecting to onboarding if needed
    router.push("/")
    router.refresh()
  }

  return (
    <div style={{
      minHeight: "100dvh",
      background: "var(--bg-base)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px 16px",
    }}>

      {/* Card */}
      <div style={{
        width: "100%",
        maxWidth: 420,
        display: "flex",
        flexDirection: "column",
        gap: 0,
      }}>

        {/* Logo + heading */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 52,
            height: 52,
            background: "var(--accent)",
            borderRadius: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
              stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 5v14M18 5v14M6 9h12M6 15h12" />
            </svg>
          </div>
          <h1 style={{
            fontSize: 24,
            fontWeight: 600,
            color: "var(--text-primary)",
            marginBottom: 6,
          }}>
            Welcome back
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
            Sign in to continue your program
          </p>
        </div>

        {/* Form card */}
        <div style={{
          background: "var(--bg-surface)",
          border: "0.5px solid var(--border-subtle)",
          borderRadius: "var(--radius-xl)",
          padding: "28px 24px",
        }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Error banner */}
            {error && (
              <div style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                background: "rgba(248,113,113,0.08)",
                border: "0.5px solid rgba(248,113,113,0.3)",
                borderRadius: "var(--radius-md)",
                padding: "10px 12px",
              }}>
                <span style={{ color: "#f87171", flexShrink: 0, marginTop: 1 }}>
                  <IcoAlert />
                </span>
                <p style={{ fontSize: 13, color: "#f87171", lineHeight: 1.5 }}>
                  {error}
                </p>
              </div>
            )}

            {/* Email */}
            <InputField
              label="Email"
              type="email"
              value={email}
              onChange={(v) => { setEmail(v); setError(null) }}
              placeholder="you@example.com"
              autoComplete="email"
              error={!!error}
              icon={<IcoMail />}
            />

            {/* Password */}
            <InputField
              label="Password"
              type={showPass ? "text" : "password"}
              value={password}
              onChange={(v) => { setPassword(v); setError(null) }}
              placeholder="Your password"
              autoComplete="current-password"
              error={!!error}
              icon={<IcoLock />}
              suffix={
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  aria-label={showPass ? "Hide password" : "Show password"}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-muted)",
                    padding: 4,
                    display: "flex",
                    flexShrink: 0,
                  }}>
                  <IcoEye open={showPass} />
                </button>
              }
            />

            {/* Submit */}
            <button
              type="submit"
              disabled={!isValid || loading}
              style={{
                marginTop: 4,
                width: "100%",
                background: isValid && !loading ? "var(--accent)" : "var(--bg-elevated)",
                border: "none",
                borderRadius: "var(--radius-md)",
                color: isValid && !loading ? "#fff" : "var(--text-muted)",
                fontSize: 15,
                fontWeight: 500,
                padding: "13px 0",
                cursor: isValid && !loading ? "pointer" : "default",
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "background 0.15s, color 0.15s",
              }}>
              {loading ? (
                <>
                  <IcoLoader />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>

          </form>
        </div>

        {/* Sign up link */}
        <p style={{
          textAlign: "center",
          fontSize: 13,
          color: "var(--text-secondary)",
          marginTop: 20,
        }}>
          Don&apos;t have an account?{" "}
          <Link
            href="/auth/signup"
            style={{
              color: "var(--accent)",
              textDecoration: "none",
              fontWeight: 500,
            }}>
            Create one
          </Link>
        </p>

      </div>
    </div>
  )
}