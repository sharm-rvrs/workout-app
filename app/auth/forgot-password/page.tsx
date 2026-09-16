"use client"

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { IcoAlert, IcoCheck, IcoDumbbellLogo, IcoLoader, IcoMail } from "@/components/AppIcons"

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
  error,
  autoComplete,
}: {
  label: string
  type: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  icon: React.ReactNode
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
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Page
// ─────────────────────────────────────────────

export default function ForgotPasswordPage() {
  const [email, setEmail]       = useState("")
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const isValid = email.trim().length > 0 && email.includes("@")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid || loading) return

    setLoading(true)
    setError(null)

    const supabase = createClient()
    const normalizedEmail = email.trim().toLowerCase()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    if (resetError) {
      const msg = resetError.message.toLowerCase()
      if (msg.includes("too many") || msg.includes("rate limit")) {
        setError("Too many attempts. Please wait a few minutes and try again.")
      } else {
        // Avoid confirming/denying whether an account exists — still show the
        // generic success state unless it's a genuine service-level failure.
        setSubmitted(true)
      }
      setLoading(false)
      return
    }

    setSubmitted(true)
    setLoading(false)
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
            Reset your password
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
            Enter your email and we&apos;ll send you a reset link
          </p>
        </div>

        {/* Form card */}
        <div style={{
          background: "var(--bg-surface)",
          border: "0.5px solid var(--border-subtle)",
          borderRadius: "var(--radius-xl)",
          padding: "28px 24px",
        }}>
          {submitted ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center", padding: "8px 0" }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "rgba(76,175,125,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#4caf7d",
              }}>
                <IcoCheck size={20} />
              </div>
              <p style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.6 }}>
                If an account exists for <strong>{email.trim()}</strong>, a password reset link is on its way. Check your inbox (and spam folder).
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
                label="Email"
                type="email"
                value={email}
                onChange={(v) => { setEmail(v); setError(null) }}
                placeholder="you@example.com"
                autoComplete="email"
                error={!!error}
                icon={<IcoMail />}
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
                    Sending…
                  </>
                ) : (
                  "Send reset link"
                )}
              </button>

            </form>
          )}
        </div>

        {/* Back to sign in */}
        <p style={{
          textAlign: "center",
          fontSize: 13,
          color: "var(--text-secondary)",
          marginTop: 20,
        }}>
          Remembered your password?{" "}
          <Link
            href="/auth/signin"
            style={{
              color: "var(--accent)",
              textDecoration: "none",
              fontWeight: 500,
            }}>
            Sign in
          </Link>
        </p>

      </div>
    </div>
  )
}
