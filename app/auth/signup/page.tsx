"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import type { FitnessLevel, Goal, PendingSignupProfile } from "@/lib/types"
import {
  IcoAlert,
  IcoCalendar,
  IcoCheck,
  IcoChevLeft as IcoChevronLeft,
  IcoDumbbellLogo,
  IcoEye,
  IcoLoader,
  IcoLock,
  IcoMail,
  IcoRuler,
  IcoScale,
  IcoUser,
} from "@/components/AppIcons"

// ─────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────

interface FormState {
  // Step 1
  email: string
  password: string
  confirmPassword: string
  // Step 2
  fullName: string
  birthday: string
  weightKg: string
  heightCm: string
  // Step 3
  goal: Goal | null
  fitnessLevel: FitnessLevel | null
}

const SIGNUP_COOLDOWN_MS = 60_000

function isPendingConfirmationError(code: string, message: string) {
  return code.includes("email_not_confirmed") || message.includes("email not confirmed")
}

function isInvalidCredentialError(code: string, message: string) {
  return code.includes("invalid_credentials") || message.includes("invalid") || message.includes("credentials")
}

function isSignupRateLimit(code: string, message: string) {
  return code === "over_email_send_rate_limit" || message.includes("email rate limit")
}

function mapSignUpErrorMessage(
  signUpMessage: string,
  signUpCode: string,
  probeMessage: string,
  probeCode: string,
) {
  if (isPendingConfirmationError(probeCode, probeMessage) || isPendingConfirmationError(signUpCode, signUpMessage)) {
    return "Account created. Please check your email and confirm your account before signing in."
  }
  if (isSignupRateLimit(signUpCode, signUpMessage)) {
    return "Too many signup attempts in a short time. Please wait before trying again."
  }
  if (signUpMessage.includes("already") || probeMessage.includes("already")) {
    return "An account with this email already exists. Try signing in."
  }
  if (probeMessage.includes("too many")) {
    return "Too many attempts. Please wait a few minutes and try again."
  }
  if (isInvalidCredentialError(probeCode, probeMessage)) {
    return "Incorrect email or password format. Please review your credentials and try again."
  }
  if (signUpMessage.includes("database") || signUpMessage.includes("saving new user")) {
    return "Account could not be created due to a server auth rule. Please contact support."
  }
  if (signUpMessage) return signUpMessage
  if (probeMessage) return probeMessage
  return "We couldn't complete sign-up right now. Please try again."
}

// ─────────────────────────────────────────────
//  Step config
// ─────────────────────────────────────────────

const TOTAL_STEPS = 3

const GOAL_OPTIONS: { value: Goal; label: string; desc: string; icon: React.ReactNode }[] = [
  {
    value: "recomp",
    label: "Body Recomposition",
    desc: "Build muscle + lose fat simultaneously",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
  },
  {
    value: "lose_fat",
    label: "Lose Fat",
    desc: "Reduce body fat while preserving muscle",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
        <path d="M8 12l2 2 4-4" />
      </svg>
    ),
  },
  {
    value: "build_muscle",
    label: "Build Muscle",
    desc: "Maximize muscle growth and strength",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 5v14M18 5v14M6 9h12M6 15h12" />
        <path d="M4 7v10M20 7v10M2 9v6M22 9v6" />
      </svg>
    ),
  },
  {
    value: "maintain",
    label: "Maintain",
    desc: "Keep current fitness and stay consistent",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12H2" />
        <path d="M12 2v20" />
      </svg>
    ),
  },
  {
    value: "endurance",
    label: "Improve Endurance",
    desc: "Build cardiovascular fitness and stamina",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
]

const LEVEL_OPTIONS: { value: FitnessLevel; label: string; desc: string }[] = [
  {
    value: "beginner",
    label: "Beginner",
    desc: "Less than 1 year of consistent training",
  },
  {
    value: "intermediate",
    label: "Intermediate",
    desc: "1–3 years of regular training",
  },
  {
    value: "advanced",
    label: "Advanced",
    desc: "3+ years, solid form and knowledge",
  },
]

// ─────────────────────────────────────────────
//  Shared input component
// ─────────────────────────────────────────────

function Field({
  label, type = "text", value, onChange, placeholder,
  icon, suffix, error, hint, autoComplete, min, max,
}: {
  label: string; type?: string; value: string
  onChange: (v: string) => void; placeholder: string
  icon?: React.ReactNode; suffix?: React.ReactNode
  error?: string; hint?: string; autoComplete?: string
  min?: string; max?: string
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)" }}>
        {label}
      </label>
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        background: "var(--bg-input)",
        border: `0.5px solid ${error ? "rgba(248,113,113,0.5)" : "var(--border-default)"}`,
        borderRadius: "var(--radius-md)", padding: "0 14px",
        transition: "border-color 0.15s",
      }}>
        {icon && (
          <span style={{ color: "var(--text-muted)", flexShrink: 0, display: "flex" }}>
            {icon}
          </span>
        )}
        <input
          type={type} value={value} placeholder={placeholder}
          autoComplete={autoComplete} min={min} max={max}
          onChange={(e) => onChange(e.target.value)}
          style={{
            flex: 1, background: "none", border: "none",
            color: "var(--text-primary)", fontSize: 14,
            fontFamily: "inherit", padding: "12px 0", outline: "none",
          }}
        />
        {suffix}
      </div>
      {error && (
        <p style={{ fontSize: 12, color: "#f87171", marginTop: 1 }}>{error}</p>
      )}
      {hint && !error && (
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>{hint}</p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
//  Progress bar
// ─────────────────────────────────────────────

function StepProgress({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{
          flex: 1, height: 3, borderRadius: 2,
          background: i < current ? "var(--accent)" : "var(--bg-elevated)",
          transition: "background 0.3s",
        }} />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────
//  Validation helpers
// ─────────────────────────────────────────────

function validateStep1(f: FormState) {
  const errors: Partial<Record<keyof FormState, string>> = {}
  if (!f.email.includes("@")) errors.email = "Enter a valid email address."
  if (f.password.length < 8) errors.password = "Password must be at least 8 characters."
  if (f.password !== f.confirmPassword) errors.confirmPassword = "Passwords do not match."
  return errors
}

function validateStep2(f: FormState) {
  const errors: Partial<Record<keyof FormState, string>> = {}
  if (!f.fullName.trim()) errors.fullName = "Name is required."
  if (!f.birthday) errors.birthday = "Birthday is required."
  if (f.weightKg && (Number(f.weightKg) < 20 || Number(f.weightKg) > 300))
    errors.weightKg = "Enter a weight between 20 and 300 kg."
  if (f.heightCm && (Number(f.heightCm) < 50 || Number(f.heightCm) > 250))
    errors.heightCm = "Enter a height between 50 and 250 cm."
  return errors
}

function calcAge(birthday: string): number {
  const dob = new Date(birthday)
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const m = today.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--
  return age
}

// ─────────────────────────────────────────────
//  Page
// ─────────────────────────────────────────────

export default function SignUpPage() {
  const router = useRouter()

  const [step, setStep] = useState(1)
  const [showPass, setShowPass]        = useState(false)
  const [showConfirm, setShowConfirm]  = useState(false)
  const [loading, setLoading]          = useState(false)
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [globalError, setGlobalError]  = useState<string | null>(null)
  const [fieldErrors, setFieldErrors]  = useState<Partial<Record<keyof FormState, string>>>({})

  const [form, setForm] = useState<FormState>({
    email: "", password: "", confirmPassword: "",
    fullName: "", birthday: "", weightKg: "", heightCm: "",
    goal: null, fitnessLevel: null,
  })

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    // Clear field-level error when user types
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }))
    setGlobalError(null)
  }

  useEffect(() => {
    if (!cooldownUntil) return

    const timer = setInterval(() => {
      setNowMs(Date.now())
    }, 1000)

    return () => clearInterval(timer)
  }, [cooldownUntil])

  // ── Step navigation ─────────────────────────

  function handleNext() {
    if (step === 1) {
      const errors = validateStep1(form)
      if (Object.keys(errors).length) { setFieldErrors(errors); return }
    }
    if (step === 2) {
      const errors = validateStep2(form)
      if (Object.keys(errors).length) { setFieldErrors(errors); return }
    }
    setFieldErrors({})
    setStep((s) => s + 1)
  }

  function handleBack() {
    setFieldErrors({})
    setGlobalError(null)
    setStep((s) => s - 1)
  }

  // ── Submit ──────────────────────────────────

  async function handleSubmit() {
    const isCooldownActive = !!cooldownUntil && cooldownUntil > Date.now()
    if (loading || isCooldownActive) return

    if (!form.goal || !form.fitnessLevel) {
      setGlobalError("Please select your goal and fitness level.")
      return
    }
    setLoading(true)
    setGlobalError(null)

    try {
      const supabase = createClient()
      const normalizedEmail = form.email.trim().toLowerCase()
      const age = form.birthday ? calcAge(form.birthday) : null

      const pendingProfile: PendingSignupProfile = {
        email: normalizedEmail,
        fullName: form.fullName.trim(),
        birthday: form.birthday || null,
        age,
        weightKg: form.weightKg ? Number(form.weightKg) : null,
        heightCm: form.heightCm ? Number(form.heightCm) : null,
        goal: form.goal,
        fitnessLevel: form.fitnessLevel,
      }

      // Keep profile fields locally so they can be completed after first verified sign-in.
      localStorage.setItem("pending_signup_profile", JSON.stringify(pendingProfile))

      // 1. Create auth user.
      // Do not send metadata here because strict DB auth hooks/triggers can reject signup payloads.
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: form.password,
      })

      if (signUpError || !authData.user) {
        const signUpMessage = (signUpError?.message ?? "").toLowerCase()
        const signUpCode = signUpError?.code?.toLowerCase() ?? ""

        const { data: probeData, error: probeError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password: form.password,
        })

        const probeMessage = (probeError?.message ?? "").toLowerCase()
        const probeCode = probeError?.code?.toLowerCase() ?? ""

        if (probeData.session) {
          localStorage.removeItem("pending_signup_profile")
          await supabase.auth.signOut()
          router.push(`/auth/signin?exists=1&email=${encodeURIComponent(normalizedEmail)}`)
          router.refresh()
          return
        }

        if (isPendingConfirmationError(probeCode, probeMessage)) {
          router.push(`/auth/signin?verify=1&email=${encodeURIComponent(normalizedEmail)}`)
          router.refresh()
          return
        }

        localStorage.removeItem("pending_signup_profile")

        if (isSignupRateLimit(signUpCode, signUpMessage)) {
          const until = Date.now() + SIGNUP_COOLDOWN_MS
          setCooldownUntil(until)
          setNowMs(Date.now())
        }

        setGlobalError(mapSignUpErrorMessage(signUpMessage, signUpCode, probeMessage, probeCode))
        return
      }

      const userId = authData.user.id

      // 2. If a session exists, we can immediately finish setup and send to onboarding.
      if (authData.session) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            full_name: form.fullName.trim(),
            birthday: form.birthday || null,
            age,
            weight_kg: form.weightKg ? Number(form.weightKg) : null,
            height_cm: form.heightCm ? Number(form.heightCm) : null,
            goal: form.goal,
            fitness_level: form.fitnessLevel,
          })
          .eq("id", userId)

        if (profileError) {
          console.error("Profile update error:", profileError)
        }

        const { error: programError } = await supabase.rpc("copy_default_program", {
          p_user_id: userId,
        })

        if (programError) {
          console.error("Program copy error:", programError)
        }

        localStorage.removeItem("pending_signup_profile")

        router.push("/onboarding")
        router.refresh()
        return
      }

      // 3. Email confirmation flow: account is created, but no session yet.
      // Redirect to sign-in with context instead of treating it as a failed signup.
      router.push(`/auth/signin?verify=1&email=${encodeURIComponent(normalizedEmail)}`)
      router.refresh()
    } catch (err) {
      console.error("Sign-up error:", err)
      localStorage.removeItem("pending_signup_profile")
      setGlobalError("We couldn't complete sign-up right now. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // ── Step 3 can be submitted ─────────────────

  const step3Valid = !!form.goal && !!form.fitnessLevel
  const cooldownRemainingSec = cooldownUntil
    ? Math.max(0, Math.ceil((cooldownUntil - nowMs) / 1000))
    : 0
  const isCooldownActive = cooldownRemainingSec > 0

  // ── Layout ──────────────────────────────────

  const stepTitles = [
    { title: "Create your account",    sub: "Start your fitness journey" },
    { title: "Tell us about yourself", sub: "Used to personalize your program" },
    { title: "Your fitness goals",     sub: "The AI will tailor your program to these" },
  ]

  return (
    <div style={{
      minHeight: "100dvh",
      background: "var(--bg-base)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "flex-start",
      padding: "32px 16px 48px",
    }}>
      <div style={{ width: "100%", maxWidth: 460 }}>

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
          <div style={{
            width: 36, height: 36,
            background: "var(--accent)", borderRadius: 10,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <IcoDumbbellLogo size={18} color="#fff" />
          </div>
          <span style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>GainLog</span>
        </div>

        {/* Progress */}
        <StepProgress current={step} total={TOTAL_STEPS} />

        {/* Step heading */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
            {stepTitles[step - 1].title}
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
            {stepTitles[step - 1].sub}
          </p>
        </div>

        {/* Global error */}
        {globalError && (
          <div style={{
            display: "flex", alignItems: "flex-start", gap: 8,
            background: "rgba(248,113,113,0.08)",
            border: "0.5px solid rgba(248,113,113,0.3)",
            borderRadius: "var(--radius-md)", padding: "10px 12px", marginBottom: 16,
          }}>
            <span style={{ color: "#f87171", flexShrink: 0, marginTop: 1 }}><IcoAlert /></span>
            <p style={{ fontSize: 13, color: "#f87171", lineHeight: 1.5 }}>{globalError}</p>
          </div>
        )}

        {/* ── STEP 1: Account ── */}
        {step === 1 && (
          <div style={{
            background: "var(--bg-surface)", 
            border: "0.5px solid var(--border-subtle)",
            borderRadius: "var(--radius-xl)", padding: "24px 20px",
            display: "flex", flexDirection: "column", gap: 14,
          }}>
            <Field
              label="Email" type="email" value={form.email}
              onChange={(v) => update("email", v)}
              placeholder="you@example.com" autoComplete="email"
              icon={<IcoMail />} error={fieldErrors.email}
            />
            <Field
              label="Password" type={showPass ? "text" : "password"} value={form.password}
              onChange={(v) => update("password", v)}
              placeholder="Min. 8 characters" autoComplete="new-password"
              hint="At least 8 characters"
              icon={<IcoLock />} error={fieldErrors.password}
              suffix={
                <button type="button" onClick={() => setShowPass(v => !v)}
                  aria-label={showPass ? "Hide" : "Show"}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4, display: "flex", flexShrink: 0 }}>
                  <IcoEye open={showPass} />
                </button>
              }
            />
            <Field
              label="Confirm password" type={showConfirm ? "text" : "password"} value={form.confirmPassword}
              onChange={(v) => update("confirmPassword", v)}
              placeholder="Repeat your password" autoComplete="new-password"
              icon={<IcoLock />} error={fieldErrors.confirmPassword}
              suffix={
                <button type="button" onClick={() => setShowConfirm(v => !v)}
                  aria-label={showConfirm ? "Hide" : "Show"}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4, display: "flex", flexShrink: 0 }}>
                  <IcoEye open={showConfirm} />
                </button>
              }
            />
          </div>
        )}

        {/* ── STEP 2: Profile ── */}
        {step === 2 && (
          <div style={{
            background: "var(--bg-surface)",
            border: "0.5px solid var(--border-subtle)",
            borderRadius: "var(--radius-xl)", padding: "24px 20px",
            display: "flex", flexDirection: "column", gap: 14,
          }}>
            <Field
              label="Full name" value={form.fullName}
              onChange={(v) => update("fullName", v)}
              placeholder="Your name" autoComplete="name"
              icon={<IcoUser />} error={fieldErrors.fullName}
            />
            <Field
              label="Birthday" type="date" value={form.birthday}
              onChange={(v) => update("birthday", v)}
              placeholder="" max={new Date().toISOString().split("T")[0]}
              icon={<IcoCalendar />} error={fieldErrors.birthday}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field
                label="Weight" type="number" value={form.weightKg}
                onChange={(v) => update("weightKg", v)}
                placeholder="e.g. 62" min="20" max="300"
                icon={<IcoScale />} error={fieldErrors.weightKg}
                hint="kg"
              />
              <Field
                label="Height" type="number" value={form.heightCm}
                onChange={(v) => update("heightCm", v)}
                placeholder="e.g. 160" min="50" max="250"
                icon={<IcoRuler />} error={fieldErrors.heightCm}
                hint="cm"
              />
            </div>

            <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
              Weight and height are used by the AI to personalize your program. You can update them anytime in your profile.
            </p>
          </div>
        )}

        {/* ── STEP 3: Goal + Level ── */}
        {step === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Goal selection */}
            <div>
              <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 10 }}>
                What is your primary goal?
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {GOAL_OPTIONS.map((opt) => {
                  const selected = form.goal === opt.value
                  return (
                    <button key={opt.value} type="button"
                      onClick={() => update("goal", opt.value)}
                      style={{
                        display: "flex", alignItems: "center", gap: 14,
                        background: selected ? "var(--accent-dim)" : "var(--bg-surface)",
                        border: `0.5px solid ${selected ? "var(--accent-border)" : "var(--border-subtle)"}`,
                        borderRadius: "var(--radius-lg)", padding: "12px 14px",
                        cursor: "pointer", textAlign: "left",
                        fontFamily: "inherit", width: "100%",
                        transition: "border-color 0.15s, background 0.15s",
                      }}>
                      {/* Icon */}
                      <div style={{
                        width: 38, height: 38, borderRadius: "var(--radius-sm)", flexShrink: 0,
                        background: selected ? "var(--accent)" : "var(--bg-elevated)",
                        border: `0.5px solid ${selected ? "var(--accent)" : "var(--border-default)"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: selected ? "#fff" : "var(--text-secondary)",
                        transition: "background 0.15s",
                      }}>
                        {opt.icon}
                      </div>
                      {/* Text */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          fontSize: 14, fontWeight: 500,
                          color: selected ? "var(--accent)" : "var(--text-primary)",
                          marginBottom: 2,
                        }}>
                          {opt.label}
                        </p>
                        <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.4 }}>
                          {opt.desc}
                        </p>
                      </div>
                      {/* Check */}
                      {selected && (
                        <div style={{
                          width: 20, height: 20, borderRadius: "50%",
                          background: "var(--accent)", flexShrink: 0,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: "#fff",
                        }}>
                          <IcoCheck />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Fitness level */}
            <div>
              <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 10 }}>
                What is your current fitness level?
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {LEVEL_OPTIONS.map((opt) => {
                  const selected = form.fitnessLevel === opt.value
                  return (
                    <button key={opt.value} type="button"
                      onClick={() => update("fitnessLevel", opt.value)}
                      style={{
                        background: selected ? "var(--accent-dim)" : "var(--bg-surface)",
                        border: `0.5px solid ${selected ? "var(--accent-border)" : "var(--border-subtle)"}`,
                        borderRadius: "var(--radius-md)", padding: "12px 8px",
                        cursor: "pointer", fontFamily: "inherit",
                        display: "flex", flexDirection: "column",
                        alignItems: "center", gap: 4, textAlign: "center",
                        transition: "border-color 0.15s, background 0.15s",
                      }}>
                      <p style={{
                        fontSize: 13, fontWeight: 500,
                        color: selected ? "var(--accent)" : "var(--text-primary)",
                      }}>
                        {opt.label}
                      </p>
                      <p style={{ fontSize: 10, color: "var(--text-muted)", lineHeight: 1.4 }}>
                        {opt.desc}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>

          </div>
        )}

        {/* ── Navigation buttons ── */}
        <div style={{
          display: "flex", gap: 10, marginTop: 20,
          flexDirection: step === 1 ? "column" : "row",
        }}>

          {/* Back button */}
          {step > 1 && (
            <button type="button" onClick={handleBack}
              style={{
                background: "none",
                border: "0.5px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
                color: "var(--text-secondary)",
                fontSize: 14, padding: "13px 16px",
                cursor: "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", gap: 4,
                flexShrink: 0,
              }}>
              <IcoChevronLeft />
              Back
            </button>
          )}

          {/* Next / Submit */}
          {step < TOTAL_STEPS ? (
            <button type="button" onClick={handleNext}
              style={{
                flex: 1, background: "var(--accent)", border: "none",
                borderRadius: "var(--radius-md)", color: "#fff",
                fontSize: 15, fontWeight: 500, padding: "13px 0",
                cursor: "pointer", fontFamily: "inherit",
              }}>
              Continue
            </button>
          ) : (
            <button type="button" onClick={handleSubmit}
              disabled={!step3Valid || loading || isCooldownActive}
              style={{
                flex: 1,
                background: step3Valid && !loading && !isCooldownActive ? "var(--accent)" : "var(--bg-elevated)",
                border: "none", borderRadius: "var(--radius-md)",
                color: step3Valid && !loading && !isCooldownActive ? "#fff" : "var(--text-muted)",
                fontSize: 15, fontWeight: 500, padding: "13px 0",
                cursor: step3Valid && !loading && !isCooldownActive ? "pointer" : "default",
                fontFamily: "inherit",
                display: "flex", alignItems: "center",
                justifyContent: "center", gap: 8,
                transition: "background 0.15s, color 0.15s",
              }}>
              {loading ? (
                <>
                  <IcoLoader />
                  Setting up your account…
                </>
              ) : isCooldownActive ? (
                `Try again in ${cooldownRemainingSec}s`
              ) : (
                "Create account"
              )}
            </button>
          )}
        </div>

        {/* Sign in link — only on step 1 */}
        {step === 1 && (
          <p style={{
            textAlign: "center", fontSize: 13,
            color: "var(--text-secondary)", marginTop: 20,
          }}>
            Already have an account?{" "}
            <Link href="/auth/signin"
              style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}>
              Sign in
            </Link>
          </p>
        )}

      </div>
    </div>
  )
}