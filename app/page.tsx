"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { getDayKeyFromStr, WORKOUT_PLAN, type DayKey, type WorkoutDay } from "@/lib/workout-data"
import { todayStrPH, getGreetingPH, getThisWeekPH, formatDateFull, parseLocalDate } from "@/lib/dates"
import { useStreak, useCurrentWeek, useWorkoutLog } from "@/hooks/useWorkoutLog"
import WorkoutIcon from "@/components/WorkoutIcon"
import { fetchUserProgramByDay } from "@/lib/program-days"
import { createClient } from "@/lib/supabase/client"
import type { FitnessLevel, Goal } from "@/lib/types"

const DAY_ABBR: Record<DayKey, string> = {
  sunday: "Sun",
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
}

type NutritionProfile = {
  goal: Goal | null
  weightKg: number | null
  heightCm: number | null
  age: number | null
  fitnessLevel: FitnessLevel | null
}

type NutritionDisplay = {
  rows: Array<{ label: string; value: string }>
  note: string
}

const DEFAULT_NUTRITION_DISPLAY: NutritionDisplay = {
  rows: [
    { label: "Protein", value: "100-110g" },
    { label: "Water", value: "2.5-3L" },
    { label: "Caloric deficit", value: "~300-400 kcal" },
  ],
  note: "Eat protein within 1-2 hrs post-workout for best muscle protein synthesis.",
}

function roundToNearest(value: number, step: number): number {
  return Math.round(value / step) * step
}

function roundToTenth(value: number): number {
  return Math.round(value * 10) / 10
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function estimateNutritionDisplay(profile: NutritionProfile): NutritionDisplay {
  const weight = profile.weightKg ?? 65
  const height = profile.heightCm ?? 165
  const age = profile.age ?? 28
  const goal = profile.goal ?? "maintain"
  const fitnessLevel = profile.fitnessLevel ?? "beginner"

  const activityFactor: Record<FitnessLevel, number> = {
    beginner: 1.4,
    intermediate: 1.55,
    advanced: 1.7,
  }

  // Neutral BMR constant to avoid sex-specific assumptions when profile does not include sex.
  const bmr = 10 * weight + 6.25 * height - 5 * age - 78
  const tdee = Math.max(1300, bmr * activityFactor[fitnessLevel])

  const goalPreset: Record<
    Goal,
    {
      calorieDeltaPct: number
      proteinPerKg: number
      fatPerKg: number
      carbFloorPerKg: number
      hydrationBonusL: number
      note: string
    }
  > = {
    lose_fat: {
      calorieDeltaPct: -0.18,
      proteinPerKg: 2.2,
      fatPerKg: 0.75,
      carbFloorPerKg: 1.2,
      hydrationBonusL: 0.15,
      note: "For fat loss, keep protein high, hit steps daily, and place most carbs around training.",
    },
    recomp: {
      calorieDeltaPct: -0.08,
      proteinPerKg: 2.1,
      fatPerKg: 0.8,
      carbFloorPerKg: 1.6,
      hydrationBonusL: 0.2,
      note: "For body recomposition, stay near maintenance, push progressive overload, and keep protein consistent.",
    },
    maintain: {
      calorieDeltaPct: 0,
      proteinPerKg: 1.8,
      fatPerKg: 0.9,
      carbFloorPerKg: 2.0,
      hydrationBonusL: 0.2,
      note: "For maintenance, hold steady intake and adjust only if bodyweight trend drifts for 2-3 weeks.",
    },
    build_muscle: {
      calorieDeltaPct: 0.1,
      proteinPerKg: 1.9,
      fatPerKg: 0.8,
      carbFloorPerKg: 2.5,
      hydrationBonusL: 0.25,
      note: "For muscle gain, target a modest surplus and prioritize carbs pre/post workout for output.",
    },
    endurance: {
      calorieDeltaPct: 0.08,
      proteinPerKg: 1.7,
      fatPerKg: 0.75,
      carbFloorPerKg: 3.0,
      hydrationBonusL: 0.35,
      note: "For endurance, protect recovery with higher carbs and increased fluid + electrolyte intake.",
    },
  }

  const selectedPreset = goalPreset[goal]
  const calorieFloor = 22 * weight
  const calories = roundToNearest(Math.max(calorieFloor, tdee * (1 + selectedPreset.calorieDeltaPct)), 25)

  const protein = Math.max(80, roundToNearest(weight * selectedPreset.proteinPerKg, 5))
  const fat = Math.max(35, roundToNearest(weight * selectedPreset.fatPerKg, 5))

  const carbFloor = weight * selectedPreset.carbFloorPerKg
  const carbsFromRemaining = (calories - protein * 4 - fat * 9) / 4
  const carbs = Math.max(roundToNearest(carbFloor, 5), roundToNearest(carbsFromRemaining, 5))

  const activityHydrationByLevel: Record<FitnessLevel, number> = {
    beginner: 0.2,
    intermediate: 0.4,
    advanced: 0.6,
  }

  const waterBase = (weight * 0.033) + activityHydrationByLevel[fitnessLevel] + selectedPreset.hydrationBonusL
  const waterMin = roundToTenth(Math.max(2.0, waterBase - 0.3))
  const waterMax = roundToTenth(clamp(waterBase + 0.5, 2.4, 5.2))

  const calorieBand: Record<Goal, number> = {
    lose_fat: 100,
    recomp: 75,
    maintain: 100,
    build_muscle: 100,
    endurance: 125,
  }

  const calorieRangeHalf = calorieBand[goal] / 2
  const calorieMin = roundToNearest(calories - calorieRangeHalf, 25)
  const calorieMax = roundToNearest(calories + calorieRangeHalf, 25)

  return {
    rows: [
      { label: "Calorie target", value: `${calorieMin}-${calorieMax} kcal` },
      { label: "Protein", value: `${Math.max(80, protein - 5)}-${protein + 5}g` },
      { label: "Carbs", value: `${carbs}g` },
      { label: "Fats", value: `${fat}g` },
      { label: "Water", value: `${waterMin}-${waterMax}L` },
    ],
    note: selectedPreset.note,
  }
}

function TodayCardSkeleton() {
  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "0.5px solid var(--border-default)",
        borderRadius: "var(--radius-xl)",
        overflow: "hidden",
        marginBottom: 20,
      }}
    >
      <div style={{ height: 3, background: "var(--border-subtle)" }} />
      <div style={{ padding: "16px 18px 18px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ width: 74, height: 20, borderRadius: 999, background: "var(--bg-elevated)" }} />
          <div style={{ width: "56%", height: 20, borderRadius: 6, background: "var(--bg-elevated)" }} />
          <div style={{ width: "74%", height: 12, borderRadius: 6, background: "var(--bg-elevated)" }} />
          <div style={{ width: "100%", height: 0.5, background: "var(--border-subtle)", margin: "4px 0" }} />
          <div style={{ width: "100%", height: 12, borderRadius: 6, background: "var(--bg-elevated)" }} />
          <div style={{ width: "92%", height: 12, borderRadius: 6, background: "var(--bg-elevated)" }} />
          <div style={{ width: "84%", height: 12, borderRadius: 6, background: "var(--bg-elevated)" }} />
          <div style={{ width: "100%", height: 40, borderRadius: "var(--radius-md)", background: "var(--bg-elevated)", marginTop: 4 }} />
        </div>
      </div>
    </div>
  )
}

export default function HomePage() {
  const [programByDay, setProgramByDay] = useState<Partial<Record<DayKey, WorkoutDay>>>({})
  const [programLoading, setProgramLoading] = useState(true)
  const [nutritionDisplay, setNutritionDisplay] = useState<NutritionDisplay>(DEFAULT_NUTRITION_DISPLAY)

  const today = todayStrPH()
  const todayKey = getDayKeyFromStr(today)

  const streak = useStreak()
  const week = useCurrentWeek()
  const { getByDate, isLoaded } = useWorkoutLog()
  const weekDateStrs = getThisWeekPH()

  useEffect(() => {
    let cancelled = false

    async function loadProgram() {
      try {
        const mapped = await fetchUserProgramByDay()
        if (!cancelled) {
          setProgramByDay(mapped)
        }
      } finally {
        if (!cancelled) {
          setProgramLoading(false)
        }
      }
    }

    void loadProgram()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadNutritionTargets() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        if (!cancelled) setNutritionDisplay(DEFAULT_NUTRITION_DISPLAY)
        return
      }

      const { data } = await supabase
        .from("profiles")
        .select("goal, weight_kg, height_cm, age, fitness_level")
        .eq("id", user.id)
        .single()

      const profile: NutritionProfile = {
        goal: (data?.goal as Goal | null) ?? null,
        weightKg: (data?.weight_kg as number | null) ?? null,
        heightCm: (data?.height_cm as number | null) ?? null,
        age: (data?.age as number | null) ?? null,
        fitnessLevel: (data?.fitness_level as FitnessLevel | null) ?? null,
      }

      if (!cancelled) {
        setNutritionDisplay(estimateNutritionDisplay(profile))
      }
    }

    void loadNutritionTargets()
    return () => {
      cancelled = true
    }
  }, [])

  const todayWorkout = programByDay[todayKey] ?? WORKOUT_PLAN[todayKey]

  const alreadyLogged = isLoaded ? !!getByDate(today) : false
  const isRestDay = todayWorkout.icon === "rest"
  const PREVIEW_LIMIT = 4
  const preview = todayWorkout.exercises.slice(0, PREVIEW_LIMIT)
  const overflow = todayWorkout.exercises.length - PREVIEW_LIMIT

  return (
    <div style={{ paddingTop: 24, paddingBottom: 8 }}>
      <div style={{ marginBottom: 18 }}>
        <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>{getGreetingPH()}</p>
        <h1 style={{ fontSize: 22, fontWeight: 500, color: "var(--text-primary)" }}>{formatDateFull(today)}</h1>
      </div>

      {programLoading ? (
        <TodayCardSkeleton />
      ) : (
        <div
          style={{
            background: "var(--bg-surface)",
            border: "0.5px solid var(--border-default)",
            borderRadius: "var(--radius-xl)",
            overflow: "hidden",
            marginBottom: 20,
          }}
        >
          {!isRestDay && <div style={{ height: 3, background: "var(--accent)" }} />}

          <div style={{ padding: "16px 18px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: isRestDay ? "var(--bg-elevated)" : "var(--accent-dim)",
                    border: `0.5px solid ${isRestDay ? "var(--border-subtle)" : "var(--accent-border)"}`,
                    borderRadius: 20,
                    padding: "3px 10px",
                    marginBottom: 8,
                  }}
                >
                  <WorkoutIcon
                    icon={todayWorkout.icon}
                    size={12}
                    color={isRestDay ? "var(--text-muted)" : "var(--accent)"}
                    strokeWidth={2}
                  />
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 500,
                      color: isRestDay ? "var(--text-muted)" : "var(--accent)",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    Today
                  </span>
                </div>
                <h2 style={{ fontSize: 19, fontWeight: 500, color: "var(--text-primary)", lineHeight: 1.2 }}>{todayWorkout.label}</h2>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 3 }}>{todayWorkout.focus}</p>
              </div>

              {alreadyLogged && !isRestDay && (
                <div
                  style={{
                    background: "rgba(76,175,125,0.12)",
                    border: "0.5px solid rgba(76,175,125,0.3)",
                    borderRadius: 20,
                    padding: "4px 10px",
                    fontSize: 11,
                    fontWeight: 500,
                    color: "var(--success)",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  Logged
                </div>
              )}
            </div>

            {!isRestDay && (
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  marginBottom: 14,
                  paddingBottom: 14,
                  borderBottom: "0.5px solid var(--border-subtle)",
                }}
              >
                {[
                  {
                    icon: (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                    ),
                    text: todayWorkout.duration,
                  },
                  {
                    icon: (
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--text-muted)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M6 5v14M18 5v14M6 9h12M6 15h12" />
                      </svg>
                    ),
                    text: todayWorkout.equipment,
                  },
                ].map(({ icon, text }, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    {icon}
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{text || "-"}</span>
                  </div>
                ))}
              </div>
            )}

            {!isRestDay && preview.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                {preview.map((exercise) => (
                  <div key={exercise.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{exercise.name}</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap", marginLeft: 12 }}>
                      {exercise.sets} x {exercise.reps ?? exercise.duration ?? "-"}
                    </span>
                  </div>
                ))}
                {overflow > 0 && (
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>+{overflow} more exercise{overflow > 1 ? "s" : ""}</span>
                )}
              </div>
            )}

            {isRestDay && (
              <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7, margin: "4px 0 16px" }}>
                Rest, eat well, and sleep 7-8 hrs. Muscle is built during recovery, not in the gym.
              </p>
            )}

            {!isRestDay && (
              <Link
                href="/log"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  background: alreadyLogged ? "transparent" : "var(--accent)",
                  border: alreadyLogged ? "0.5px solid var(--border-default)" : "none",
                  borderRadius: "var(--radius-md)",
                  color: alreadyLogged ? "var(--text-secondary)" : "#fff",
                  fontSize: 14,
                  fontWeight: 500,
                  padding: "12px 0",
                  textDecoration: "none",
                }}
              >
                {alreadyLogged ? (
                  <>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    Edit today log
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="1.5" strokeLinecap="round">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    Start logging
                  </>
                )}
              </Link>
            )}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <p
          style={{
            fontSize: 10,
            color: "var(--text-secondary)",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom: 10,
          }}
        >
          This week
        </p>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none", padding: "2px 0 6px" }}>
          {weekDateStrs.map(({ dateStr }) => {
            const key = getDayKeyFromStr(dateStr)
            const day = programByDay[key] ?? WORKOUT_PLAN[key]
            const isToday = dateStr === today
            const midnight = parseLocalDate(today)
            const dayDate = parseLocalDate(dateStr)
            const isPast = dayDate < midnight

            return (
              <Link key={dateStr} href={`/log?date=${dateStr}`} style={{ textDecoration: "none", flexShrink: 0 }}>
                <div
                  style={{
                    width: 62,
                    background: isToday ? "var(--accent-dim)" : "var(--bg-surface)",
                    border: `0.5px solid ${isToday ? "var(--accent-border)" : "var(--border-subtle)"}`,
                    borderRadius: "var(--radius-md)",
                    padding: "10px 6px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    opacity: isPast && !isToday ? 0.45 : 1,
                  }}
                >
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 500,
                      color: isToday ? "var(--accent)" : "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {DAY_ABBR[key]}
                  </span>
                  <WorkoutIcon icon={day.icon} size={18} color={isToday ? "var(--accent)" : "var(--text-muted)"} strokeWidth={1.5} />
                  <span
                    style={{ fontSize: 9, color: isToday ? "var(--accent)" : "var(--text-muted)", textAlign: "center", lineHeight: 1.3 }}
                  >
                    {day.shortLabel}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 12 }}>
        {[
          {
            icon: (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            ),
            label: "Streak",
            value: isLoaded ? streak : "-",
            sub: "days in a row",
          },
          {
            icon: (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            ),
            label: "Program",
            value: isLoaded ? `Wk ${week}` : "-",
            sub: "of 12 weeks",
          },
        ].map(({ icon, label, value, sub }) => (
          <div
            key={label}
            style={{
              flex: 1,
              background: "var(--bg-surface)",
              border: "0.5px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              padding: "14px 12px",
              display: "flex",
              flexDirection: "column",
              gap: 3,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              {icon}
              <span style={{ fontSize: 10, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
            </div>
            <span style={{ fontSize: 26, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1 }}>{value}</span>
            <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{sub}</span>
          </div>
        ))}
      </div>

      <div
        style={{
          background: "var(--bg-surface)",
          border: "0.5px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          padding: "14px 16px",
        }}
      >
        <p
          style={{
            fontSize: 10,
            color: "var(--text-secondary)",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom: 12,
          }}
        >
          Daily nutrition targets
        </p>
        {nutritionDisplay.rows.map(({ label, value }) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 9 }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{label}</span>
            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", textAlign: "right" }}>{value}</span>
          </div>
        ))}
        <p
          style={{
            fontSize: 11,
            color: "var(--text-secondary)",
            lineHeight: 1.6,
            borderTop: "0.5px solid var(--border-subtle)",
            paddingTop: 10,
            marginTop: 4,
          }}
        >
          {nutritionDisplay.note}
        </p>
      </div>
    </div>
  )
}
