"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { usePersonalBests, useStreak, useWorkoutLog } from "@/hooks/useWorkoutLog"
import type { Goal } from "@/lib/types"

type ProfileState = {
  fullName: string
  email: string
  goal: Goal | null
  weightKg: number | null
  heightCm: number | null
}

const GOAL_LABELS: Record<Goal, string> = {
  recomp: "Body recomposition",
  lose_fat: "Lose fat",
  build_muscle: "Build muscle",
  maintain: "Maintain",
  endurance: "Improve endurance",
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "0.5px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        padding: "14px 12px",
      }}
    >
      <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{label}</p>
      <p style={{ fontSize: 24, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1 }}>{value}</p>
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div style={{ paddingTop: 24, paddingBottom: 8 }}>
      <div style={{ width: 170, height: 24, borderRadius: 6, background: "var(--bg-elevated)", marginBottom: 16 }} />
      <div style={{ background: "var(--bg-surface)", border: "0.5px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: 18, marginBottom: 14 }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--bg-elevated)", marginBottom: 12 }} />
        <div style={{ width: "48%", height: 18, borderRadius: 6, background: "var(--bg-elevated)", marginBottom: 8 }} />
        <div style={{ width: "64%", height: 12, borderRadius: 6, background: "var(--bg-elevated)", marginBottom: 8 }} />
        <div style={{ width: "36%", height: 12, borderRadius: 6, background: "var(--bg-elevated)" }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} style={{ background: "var(--bg-surface)", border: "0.5px solid var(--border-subtle)", borderRadius: "var(--radius-md)", height: 94 }} />
        ))}
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const router = useRouter()
  const { logs, isLoaded } = useWorkoutLog()
  const streak = useStreak()
  const bests = usePersonalBests()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<ProfileState>({
    fullName: "",
    email: "",
    goal: null,
    weightKg: null,
    heightCm: null,
  })

  useEffect(() => {
    let cancelled = false

    async function loadProfile() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace("/auth/signin")
        return
      }

      const { data } = await supabase
        .from("profiles")
        .select("full_name, goal, weight_kg, height_cm")
        .eq("id", user.id)
        .single()

      if (!cancelled) {
        setProfile({
          fullName: (data?.full_name as string | null) ?? "",
          email: user.email ?? "",
          goal: (data?.goal as Goal | null) ?? null,
          weightKg: (data?.weight_kg as number | null) ?? null,
          heightCm: (data?.height_cm as number | null) ?? null,
        })
        setLoading(false)
      }
    }

    void loadProfile()
    return () => {
      cancelled = true
    }
  }, [router])

  const initials = useMemo(() => {
    const parts = profile.fullName
      .trim()
      .split(/\s+/)
      .filter(Boolean)

    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (profile.email.slice(0, 2) || "?").toUpperCase()
  }, [profile.fullName, profile.email])

  async function handleSaveProfile() {
    setSaving(true)
    setError(null)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace("/auth/signin")
        return
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: profile.fullName.trim() || null,
          goal: profile.goal,
          weight_kg: profile.weightKg,
          height_cm: profile.heightCm,
        })
        .eq("id", user.id)

      if (updateError) {
        setError(updateError.message)
        return
      }

      setEditing(false)
    } catch {
      setError("Could not save profile changes.")
    } finally {
      setSaving(false)
    }
  }

  async function handleSignOut() {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace("/auth/signin")
    router.refresh()
  }

  if (loading) return <ProfileSkeleton />

  return (
    <div style={{ paddingTop: 24, paddingBottom: 8 }}>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, color: "var(--text-primary)", marginBottom: 4 }}>My Profile</h1>
        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Account, goals, and your current training stats.</p>
      </div>

      <section
        style={{
          background: "var(--bg-surface)",
          border: "0.5px solid var(--border-default)",
          borderRadius: "var(--radius-lg)",
          padding: "16px 16px 14px",
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: "50%",
              background: "var(--accent-dim)",
              border: "0.5px solid var(--accent-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent)",
              fontSize: 18,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {initials}
          </div>

          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 17, fontWeight: 500, color: "var(--text-primary)", lineHeight: 1.2 }}>{profile.fullName || "GainLog User"}</p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2, wordBreak: "break-all" }}>{profile.email}</p>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 6 }}>
              Goal: {profile.goal ? GOAL_LABELS[profile.goal] : "Not set"}
            </p>
          </div>
        </div>

        {editing ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input
              value={profile.fullName}
              onChange={(event) => setProfile((prev) => ({ ...prev, fullName: event.target.value }))}
              placeholder="Full name"
              style={{
                background: "var(--bg-input)",
                border: "0.5px solid var(--border-default)",
                borderRadius: "var(--radius-sm)",
                color: "var(--text-primary)",
                fontSize: 13,
                padding: "9px 10px",
                outline: "none",
              }}
            />

            <select
              value={profile.goal ?? ""}
              onChange={(event) => setProfile((prev) => ({ ...prev, goal: (event.target.value || null) as Goal | null }))}
              style={{
                background: "var(--bg-input)",
                border: "0.5px solid var(--border-default)",
                borderRadius: "var(--radius-sm)",
                color: "var(--text-primary)",
                fontSize: 13,
                padding: "9px 10px",
                outline: "none",
              }}
            >
              <option value="">Select goal</option>
              {Object.entries(GOAL_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <input
                type="number"
                value={profile.weightKg ?? ""}
                onChange={(event) =>
                  setProfile((prev) => ({
                    ...prev,
                    weightKg: event.target.value ? Number(event.target.value) : null,
                  }))
                }
                placeholder="Weight (kg)"
                style={{
                  background: "var(--bg-input)",
                  border: "0.5px solid var(--border-default)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text-primary)",
                  fontSize: 13,
                  padding: "9px 10px",
                  outline: "none",
                }}
              />
              <input
                type="number"
                value={profile.heightCm ?? ""}
                onChange={(event) =>
                  setProfile((prev) => ({
                    ...prev,
                    heightCm: event.target.value ? Number(event.target.value) : null,
                  }))
                }
                placeholder="Height (cm)"
                style={{
                  background: "var(--bg-input)",
                  border: "0.5px solid var(--border-default)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text-primary)",
                  fontSize: 13,
                  padding: "9px 10px",
                  outline: "none",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={saving}
                style={{
                  flex: 1,
                  background: "var(--accent)",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 500,
                  padding: "10px 0",
                  cursor: saving ? "default" : "pointer",
                  fontFamily: "inherit",
                }}
              >
                {saving ? "Saving..." : "Save profile"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                disabled={saving}
                style={{
                  flex: 1,
                  background: "var(--bg-elevated)",
                  border: "0.5px solid var(--border-default)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text-secondary)",
                  fontSize: 13,
                  fontWeight: 500,
                  padding: "10px 0",
                  cursor: saving ? "default" : "pointer",
                  fontFamily: "inherit",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setEditing(true)}
              style={{
                background: "var(--bg-elevated)",
                border: "0.5px solid var(--border-default)",
                borderRadius: "var(--radius-sm)",
                color: "var(--text-secondary)",
                fontSize: 13,
                fontWeight: 500,
                padding: "9px 14px",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Edit profile
            </button>
            <Link
              href="/program"
              style={{
                background: "transparent",
                border: "0.5px solid var(--border-subtle)",
                borderRadius: "var(--radius-sm)",
                color: "var(--text-muted)",
                fontSize: 13,
                fontWeight: 500,
                padding: "9px 14px",
                textDecoration: "none",
              }}
            >
              Edit program
            </Link>
          </div>
        )}

        {error && <p style={{ fontSize: 12, color: "#ff6b6b", marginTop: 10 }}>{error}</p>}
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
        <StatCard label="Total sessions" value={isLoaded ? logs.length : "-"} />
        <StatCard label="Current streak" value={isLoaded ? streak : "-"} />
        <StatCard label="Personal records" value={isLoaded ? bests.length : "-"} />
      </section>

      <section
        style={{
          background: "var(--bg-surface)",
          border: "0.5px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          padding: "14px 16px",
          marginBottom: 14,
        }}
      >
        <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
          Body stats
        </p>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Weight</span>
          <span style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>
            {profile.weightKg != null ? `${profile.weightKg} kg` : "Not set"}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Height</span>
          <span style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>
            {profile.heightCm != null ? `${profile.heightCm} cm` : "Not set"}
          </span>
        </div>
      </section>

      <button
        type="button"
        onClick={handleSignOut}
        disabled={signingOut}
        style={{
          width: "100%",
          background: "rgba(220,60,60,0.14)",
          border: "0.5px solid rgba(220,60,60,0.4)",
          borderRadius: "var(--radius-md)",
          color: "#ff8d8d",
          fontSize: 14,
          fontWeight: 500,
          padding: "12px 0",
          cursor: signingOut ? "default" : "pointer",
          fontFamily: "inherit",
        }}
      >
        {signingOut ? "Signing out..." : "Sign out"}
      </button>
    </div>
  )
}
