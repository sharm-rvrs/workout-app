"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { IcoBot, IcoCheck, IcoLoader, IcoSettings } from "@/components/AppIcons"
import { trackTelemetryEvent } from "@/lib/telemetry"
import { getOnboardingTransition, markOnboardingCompleted } from "@/lib/onboarding"
import { isValidRecommendationShape, type WeeklySeriesDay } from "@/lib/recommendation"

// ─────────────────────────────────────────────
//  Typing animation for AI text
// ─────────────────────────────────────────────

function TypewriterText({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState("")
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!text) return
    let i = 0

    const interval = setInterval(() => {
      i++
      setDisplayed(text.slice(0, i))
      if (i >= text.length) {
        clearInterval(interval)
        setDone(true)
      }
    }, 12) // ~12ms per character — fast enough to feel snappy

    return () => clearInterval(interval)
  }, [text])

  return (
    <p style={{
      fontSize: 14,
      color: "var(--text-primary)",
      lineHeight: 1.75,
      whiteSpace: "pre-wrap",
    }}>
      {displayed}
      {!done && (
        <span style={{
          display: "inline-block",
          width: 2, height: 16,
          background: "var(--accent)",
          marginLeft: 2,
          animation: "blink 1s step-end infinite",
          verticalAlign: "text-bottom",
        }} />
      )}
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
    </p>
  )
}

// ─────────────────────────────────────────────
//  Skeleton loader while AI thinks
// ─────────────────────────────────────────────

function SkeletonLines() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {[100, 88, 95, 72, 85].map((w, i) => (
        <div key={i} style={{
          height: 14, borderRadius: 4,
          background: "var(--bg-elevated)",
          width: `${w}%`,
          animation: "pulse 1.5s ease-in-out infinite",
          animationDelay: `${i * 0.1}s`,
        }} />
      ))}
      <style>{`@keyframes pulse{0%,100%{opacity:.4}50%{opacity:.9}}`}</style>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Page
// ─────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()

  const [loading, setLoading]             = useState(true)
  const [recommendation, setRecommendation] = useState<string | null>(null)
  const [firstName, setFirstName]         = useState<string>("")
  const [confirming, setConfirming]       = useState(false)
  const [error, setError]                 = useState<string | null>(null)
  const [weeklySeries, setWeeklySeries]   = useState<WeeklySeriesDay[]>([])
  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch("/api/recommend-program")
        if (!res.ok) throw new Error("Failed to load")
        const data = await res.json()
        if (cancelled) return

        if (!isValidRecommendationShape(data)) {
          throw new Error("Invalid recommendation shape")
        }

        // Extract first name for personalised greeting
        const name: string = data.profile?.full_name ?? ""
        setFirstName(name.split(" ")[0] ?? "")
        setRecommendation(data.recommendation)
        setWeeklySeries(data.weekly_series)

        trackTelemetryEvent("recommendation_generated", {
          source: data.source,
          weekly_days: data.weekly_series.length,
        })

        if (data.source === "fallback") {
          trackTelemetryEvent("recommendation_fallback_used", {
            reason: "ai_unavailable_or_failed",
          })
        }
      } catch {
        if (!cancelled) setError("Couldn't load your recommendation. You can skip and set up manually.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!isCustomizeModalOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isCustomizeModalOpen])

  async function applyRecommendedProgram(): Promise<boolean> {
    try {
      const res = await fetch("/api/recommend-program", { method: "POST" })
      if (!res.ok) {
        setError("Couldn't apply your program yet. Please try again.")
        return false
      }

      await res.json().catch(() => null)
      return true
    } catch {
      setError("Couldn't apply your program yet. Please try again.")
      return false
    }
  }

  async function confirmProgram() {
    trackTelemetryEvent("onboarding_use_plan_clicked", {
      source: "onboarding",
    })
    trackTelemetryEvent("recommendation_accepted", {
      source: "onboarding",
    })

    setConfirming(true)
    setError(null)

    const didApplyProgram = await applyRecommendedProgram()
    if (!didApplyProgram) {
      setConfirming(false)
      return
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      try {
        const { confirmedAt, persistedFields } = await markOnboardingCompleted(supabase, user.id, "use_plan")
        trackTelemetryEvent("onboarding_completed", {
          source: "use_plan",
          confirmed_at: confirmedAt,
          persisted_fields: persistedFields.join(","),
        })
      } catch {
        setConfirming(false)
        setError("Couldn't confirm your plan yet. Please try again.")
        return
      }
    }

    const transition = getOnboardingTransition("use_plan")
    router.push(transition.nextPath)
    router.refresh()
  }

  async function goCustomize() {
    trackTelemetryEvent("onboarding_customize_clicked", {
      source: "onboarding",
    })
    trackTelemetryEvent("recommendation_rejected", {
      source: "onboarding",
      reason: "customize_clicked",
    })

    setConfirming(true)
    setError(null)

    const didApplyProgram = await applyRecommendedProgram()
    if (!didApplyProgram) {
      setConfirming(false)
      return
    }

    setIsCustomizeModalOpen(true)
    setConfirming(false)
  }

  return (
    <div style={{
      minHeight: "100dvh",
      background: "var(--bg-base)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "flex-start",
      padding: "40px 16px 60px",
    }}>
      <div style={{ width: "100%", maxWidth: 520 }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          {/* AI avatar */}
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: "var(--accent-dim)",
            border: "0.5px solid var(--accent-border)",
            display: "flex", alignItems: "center",
            justifyContent: "center", color: "var(--accent)",
            margin: "0 auto 16px",
          }}>
            <IcoBot />
          </div>

          <h1 style={{
            fontSize: 22, fontWeight: 600,
            color: "var(--text-primary)", marginBottom: 6,
          }}>
            {firstName ? `Welcome, ${firstName}!` : "Welcome to GainLog!"}
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>
            Your program is ready. The AI has reviewed it based on your profile and has a few thoughts.
          </p>
        </div>

        {/* AI recommendation card */}
        <div style={{
          background: "var(--bg-surface)",
          border: "0.5px solid var(--border-default)",
          borderRadius: "var(--radius-xl)",
          overflow: "hidden",
          marginBottom: 16,
        }}>
          {/* Card header */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "14px 18px",
            borderBottom: "0.5px solid var(--border-subtle)",
            background: "var(--accent-dim)",
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: "var(--accent-dim)",
              border: "0.5px solid var(--accent-border)",
              display: "flex", alignItems: "center",
              justifyContent: "center", color: "var(--accent)",
              flexShrink: 0,
            }}>
              <IcoBot />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 500, color: "var(--accent)" }}>
                GainLog AI
              </p>
              <p style={{ fontSize: 11, color: "var(--text-muted)" }}>
                Program review · Powered by Groq
              </p>
            </div>
          </div>

          {/* Card body */}
          <div style={{ padding: "18px 18px 20px" }}>
            {loading ? (
              <SkeletonLines />
            ) : error ? (
              <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                {error}
              </p>
            ) : recommendation ? (
              <TypewriterText text={recommendation} />
            ) : null}
          </div>
        </div>

        {/* What's next card */}
        <div style={{
          background: "var(--bg-surface)",
          border: "0.5px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          padding: "14px 16px",
          marginBottom: 24,
        }}>
          <p style={{
            fontSize: 11, color: "var(--text-muted)",
            textTransform: "uppercase", letterSpacing: "0.08em",
            marginBottom: 10,
          }}>
            Your program includes
          </p>
          {weeklySeries.map((item) => (
            <div key={item.day_key} style={{
              display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 7,
            }}>
              <div style={{
                width: 18, height: 18, borderRadius: "50%",
                background: "var(--accent-dim)",
                border: "0.5px solid var(--accent-border)",
                display: "flex", alignItems: "center",
                justifyContent: "center", color: "var(--accent)",
                flexShrink: 0, marginTop: 1,
              }}>
                <IcoCheck />
              </div>
              <span style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                {`${item.day_key.slice(0, 3).toUpperCase()} — ${item.label} (${item.focus})`}
              </span>
            </div>
          ))}
        </div>

        {/* CTA buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            onClick={confirmProgram}
            disabled={confirming || loading}
            style={{
              width: "100%",
              background: confirming || loading ? "var(--bg-elevated)" : "var(--accent)",
              border: "none",
              borderRadius: "var(--radius-md)",
              color: confirming || loading ? "var(--text-muted)" : "#fff",
              fontSize: 15, fontWeight: 500, padding: "14px 0",
              cursor: confirming || loading ? "default" : "pointer",
              fontFamily: "inherit",
              display: "flex", alignItems: "center",
              justifyContent: "center", gap: 8,
              transition: "background 0.15s",
            }}>
            {confirming ? (
              <>
                <IcoLoader />
                Getting things ready…
              </>
            ) : (
              <>
                <IcoCheck />
                Looks good — start my program
              </>
            )}
          </button>

          <button
            onClick={goCustomize}
            disabled={confirming || loading}
            style={{
              width: "100%",
              background: "none",
              border: "0.5px solid var(--border-default)",
              borderRadius: "var(--radius-md)",
              color: "var(--text-secondary)",
              fontSize: 14, padding: "13px 0",
              cursor: confirming || loading ? "default" : "pointer",
              fontFamily: "inherit",
              display: "flex", alignItems: "center",
              justifyContent: "center", gap: 7,
            }}>
            <IcoSettings />
            Customize my program first
          </button>
        </div>

        {/* Fine print */}
        <p style={{
          fontSize: 11, color: "var(--text-muted)",
          textAlign: "center", marginTop: 16, lineHeight: 1.6,
        }}>
          You can edit your program anytime from the Program tab.
          The AI assistant in chat can also give personalized advice as you train.
        </p>

      </div>

      {isCustomizeModalOpen && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          zIndex: 1000,
        }}>
          <div style={{
            width: "100%",
            maxWidth: 980,
            height: "min(85dvh, 860px)",
            background: "var(--bg-surface)",
            border: "0.5px solid var(--border-default)",
            borderRadius: "var(--radius-xl)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.35)",
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 18px",
              borderBottom: "0.5px solid var(--border-subtle)",
            }}>
              <h2 style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 600,
                color: "var(--text-primary)",
              }}>
                Customize Program
              </h2>
              <button
                onClick={() => setIsCustomizeModalOpen(false)}
                style={{
                  background: "var(--accent)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "var(--radius-md)",
                  padding: "8px 14px",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Done
              </button>
            </div>

            <iframe
              title="Program editor"
              src="/program"
              style={{
                width: "100%",
                height: "100%",
                border: "none",
                background: "var(--bg-base)",
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}