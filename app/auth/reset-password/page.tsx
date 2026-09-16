"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { IcoAlert, IcoDumbbellLogo, IcoEye, IcoLoader, IcoLock } from "@/components/AppIcons"

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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordContent />
    </Suspense>
  )
}

function ResetPasswordFallback() {
  return <div style={{ minHeight: "100dvh", background: "var(--bg-base)" }} />
}

type VerifyState = "verifying" | "ready" | "invalid"

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [verifyState, setVerifyState] = useState<VerifyState>("verifying")
  const [password, setPassword]               = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPass, setShowPass]                 = useState(false)
  const [loading, setLoading]                   = useState(false)
  const [error, setError]                       = useState<string | null>(null)
  const [done, setDone]                         = useState(false)

  // Exchange the one-time recovery code (or hash-based error) for a session.
  useEffect(() => {
    let cancelled = false

    async function verifyLink() {
      const supabase = createClient()

      // Supabase redirects failed/expired links with error info in the hash.
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""))
      const hashError = hashParams.get("error") || hashParams.get("error_code")
      if (hashError) {
        if (!cancelled) setVerifyState("invalid")
        return
      }

      const code = searchParams.get("code")
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (!cancelled) setVerifyState(exchangeError ? "invalid" : "ready")
        return
      }

      // No code in the URL — fall back to checking for an existing recovery session.
      const { data } = await supabase.auth.getSession()
      if (!cancelled) setVerifyState(data.session ? "ready" : "invalid")
    }

    verifyLink()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isValid = password.length >= 6 && password === confirmPassword

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid || loading) return

    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message || "Couldn't update your password. Please try again.")
      setLoading(false)
      return
    }

    await supabase.auth.signOut()
    setDone(true)
    setLoading(false)

    window.setTimeout(() => {
      router.push("/auth/signin?reset=1")
    }, 1500)
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
            <IcoDumbbellLogo size={26} color="#fff" />
          </div>
          <h1 style={{
            fontSize: 24,
            fontWeight: 600,
            color: "var(--text-primary)",
            marginBottom: 6,
          }}>
            Set a new password
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
            Choose a new password for your account
          </p>
        </div>

        {/* Form card */}
        <div style={{
          background: "var(--bg-surface)",
          border: "0.5px solid var(--border-subtle)",
          borderRadius: "var(--radius-xl)",
          padding: "28px 24px",
        }}>

          {verifyState === "verifying" && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "24px 0", color: "var(--text-secondary)", fontSize: 14 }}>
              <IcoLoader />
              Verifying link…
            </div>
          )}

          {verifyState === "invalid" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center", padding: "8px 0" }}>
              <span style={{ color: "#f87171" }}>
                <IcoAlert size={22} />
              </span>
              <p style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.6 }}>
                This reset link is invalid or has expired.
              </p>
              <Link
                href="/auth/forgot-password"
                style={{
                  color: "var(--accent)",
                  textDecoration: "none",
                  fontWeight: 500,
                  fontSize: 13,
                }}>
                Request a new link
              </Link>
            </div>
          )}

          {verifyState === "ready" && (
            done ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center", padding: "8px 0" }}>
                <p style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.6 }}>
                  Password updated. Redirecting you to sign in…
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

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

                <InputField
                  label="New password"
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(v) => { setPassword(v); setError(null) }}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
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

                <InputField
                  label="Confirm new password"
                  type={showPass ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(v) => { setConfirmPassword(v); setError(null) }}
                  placeholder="Re-enter your new password"
                  autoComplete="new-password"
                  error={!!error || (confirmPassword.length > 0 && confirmPassword !== password)}
                  icon={<IcoLock />}
                />

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
                      Updating…
                    </>
                  ) : (
                    "Update password"
                  )}
                </button>

              </form>
            )
          )}

        </div>

        {verifyState !== "ready" && (
          <p style={{
            textAlign: "center",
            fontSize: 13,
            color: "var(--text-secondary)",
            marginTop: 20,
          }}>
            <Link
              href="/auth/signin"
              style={{
                color: "var(--accent)",
                textDecoration: "none",
                fontWeight: 500,
              }}>
              Back to sign in
            </Link>
          </p>
        )}

      </div>
    </div>
  )
}
