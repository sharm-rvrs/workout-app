"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import confetti from "canvas-confetti"
import toast from "react-hot-toast"
import {
  WORKOUT_PLAN,
  getDayKeyFromStr,
  getLogs,
  savelog,
  getLogByDate,
  type DayKey,
  type ExerciseLog,
  type WorkoutDay,
} from "@/lib/workout-data"
import { todayStrPH } from "@/lib/dates"
import WorkoutIcon, { DayBadge } from "@/components/WorkoutIcon"
import { IcoCalendar, IcoPlus, IcoSave } from "@/components/AppIcons"
import { AddExerciseForm } from "@/components/log/AddExerciseForm"
import { DayOverridePicker } from "@/components/log/DayOverridePicker"
import { ExerciseCard } from "@/components/log/ExerciseCard"
import { createExerciseLogsFromWorkoutDay, fetchUserProgramByDay } from "@/lib/program-days"
import { getRecentExerciseTemplates, type RecentExerciseTemplate } from "@/lib/log-insights"
import { RecentExercisesPicker } from "@/components/log/RecentExercisesPicker"
import { trackTelemetryEvent } from "@/lib/telemetry"

function getMaxWeightForExercise(ex: ExerciseLog): number {
  let max = 0
  for (const s of ex.sets) {
    const w = s.weightKg
    if (typeof w === "number" && w > max) max = w
  }
  return max
}

function LogPageInner() {
  const searchParams = useSearchParams()
  const initialDate = searchParams.get("date") ?? todayStrPH()

  const [date, setDate] = useState(initialDate)
  const [effectiveDayKey, setEffectiveDayKey] = useState<DayKey>(() => getDayKeyFromStr(initialDate))
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set())
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([])
  const [logId, setLogId] = useState(() => crypto.randomUUID())
  const [showDayPicker, setShowDayPicker] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [programByDay, setProgramByDay] = useState<Partial<Record<DayKey, WorkoutDay>>>({})
  const [programLoading, setProgramLoading] = useState(true)
  const [prefillRecent, setPrefillRecent] = useState<RecentExerciseTemplate | null>(null)
  const [hasSentLogStarted, setHasSentLogStarted] = useState(false)
  const recentExercises = getRecentExerciseTemplates(getLogs())

  useEffect(() => {
    let cancelled = false

    async function loadProgram() {
      try {
        const mapped = await fetchUserProgramByDay()
        if (!cancelled) {
          setProgramByDay(mapped)
        }
      } finally {
        if (!cancelled) setProgramLoading(false)
      }
    }

    void loadProgram()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (programLoading) return

    const existing = getLogByDate(date)
    if (existing) {
      queueMicrotask(() => {
        setLogId(existing.id)
        setEffectiveDayKey(existing.dayOverride ?? existing.dayKey)
        setSkippedIds(new Set(existing.skippedExerciseIds ?? []))
        setExerciseLogs(existing.exercises)
      })
    } else {
      const key = getDayKeyFromStr(date)
      const day = programByDay[key] ?? WORKOUT_PLAN[key]
      queueMicrotask(() => {
        setLogId(crypto.randomUUID())
        setEffectiveDayKey(key)
        setSkippedIds(new Set())
        setExerciseLogs(createExerciseLogsFromWorkoutDay(day))
      })
    }
  }, [date, programLoading, programByDay])

  function handleDayOverride(newKey: DayKey) {
    setShowDayPicker(false)
    if (newKey === effectiveDayKey) return

    setEffectiveDayKey(newKey)
    setSkippedIds(new Set())

    const day = programByDay[newKey] ?? WORKOUT_PLAN[newKey]
    const defaultLogs = createExerciseLogsFromWorkoutDay(day)
    const customLogs = exerciseLogs.filter((e) => e.isCustom)
    setExerciseLogs([...defaultLogs, ...customLogs])
  }

  function handleDateChange(nextDate: string) {
    setDate(nextDate)
    setHasSentLogStarted(false)
  }

  function removeExercise(exerciseId: string, isCustom: boolean) {
    if (isCustom) {
      setExerciseLogs((prev) => prev.filter((e) => e.exerciseId !== exerciseId))
    } else {
      setSkippedIds((prev) => new Set([...prev, exerciseId]))
      setExerciseLogs((prev) => prev.filter((e) => e.exerciseId !== exerciseId))
    }
  }

  function updateExerciseLog(exerciseId: string, updated: ExerciseLog) {
    if (!hasSentLogStarted) {
      trackTelemetryEvent("log_started", {
        date,
        day_key: effectiveDayKey,
        source: "set_update",
      })
      setHasSentLogStarted(true)
    }
    setExerciseLogs((prev) => prev.map((e) => (e.exerciseId === exerciseId ? updated : e)))
  }

  function handleRecentPicked(recent: RecentExerciseTemplate) {
    if (!hasSentLogStarted) {
      trackTelemetryEvent("log_started", {
        date,
        day_key: effectiveDayKey,
        source: "recent_picker",
      })
      setHasSentLogStarted(true)
    }

    setPrefillRecent(recent)
    setShowAddForm(true)
  }

  function handleSave() {
    try {
      const dayKey = getDayKeyFromStr(date)
      const prevLogs = getLogs().filter((l) => !(l.date === date && l.dayKey === dayKey))
      const prevBestByExerciseId = new Map<string, number>()

      for (const l of prevLogs) {
        for (const ex of l.exercises) {
          const max = getMaxWeightForExercise(ex)
          if (max <= 0) continue
          const prev = prevBestByExerciseId.get(ex.exerciseId) ?? 0
          if (max > prev) prevBestByExerciseId.set(ex.exerciseId, max)
        }
      }

      savelog({
        id: logId,
        date,
        dayKey,
        dayOverride: effectiveDayKey !== dayKey ? effectiveDayKey : undefined,
        skippedExerciseIds: Array.from(skippedIds),
        exercises: exerciseLogs,
        completedAt: new Date().toISOString(),
      })

      trackTelemetryEvent("log_saved", {
        date,
        day_key: dayKey,
        effective_day_key: effectiveDayKey,
        exercise_count: exerciseLogs.length,
      })

      toast.success("Workout saved!")

      let bestHit: { exerciseName: string; weightKg: number } | null = null
      for (const ex of exerciseLogs) {
        const max = getMaxWeightForExercise(ex)
        if (max <= 0) continue
        const prev = prevBestByExerciseId.get(ex.exerciseId) ?? 0
        if (max > prev && (!bestHit || max > bestHit.weightKg)) {
          bestHit = { exerciseName: ex.exerciseName, weightKg: max }
        }
      }

      if (bestHit) {
        confetti({
          particleCount: 140,
          spread: 75,
          origin: { y: 0.7 },
        })
        toast.success(`New personal best: ${bestHit.exerciseName} - ${bestHit.weightKg} kg`)
      }
    } catch {
      toast.error("Failed to save. Try again.")
    }
  }

  if (programLoading) return null

  const workout = programByDay[effectiveDayKey] ?? WORKOUT_PLAN[effectiveDayKey]
  const isRestDay = workout.icon === "rest"
  const isOverridden = effectiveDayKey !== getDayKeyFromStr(date)
  const hasAnyLogs = getLogs().length > 0

  return (
    <div style={{ paddingTop: 24, paddingBottom: 8 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, color: "var(--text-primary)", marginBottom: 14 }}>
          Log Workout
        </h1>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "var(--bg-surface)",
            border: "0.5px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
            padding: "10px 14px",
          }}
        >
          <IcoCalendar size={14} stroke="var(--text-muted)" />
          <input
            type="date"
            value={date}
            max={todayStrPH()}
            onChange={(e) => handleDateChange(e.target.value)}
            style={{
              flex: 1,
              background: "none",
              border: "none",
              color: "var(--text-primary)",
              fontSize: 14,
              fontFamily: "inherit",
              outline: "none",
              cursor: "pointer",
            }}
          />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: isRestDay ? "var(--bg-surface)" : "var(--accent-dim)",
          border: `0.5px solid ${isRestDay ? "var(--border-subtle)" : "var(--accent-border)"}`,
          borderRadius: "var(--radius-md)",
          padding: "12px 14px",
          marginBottom: 20,
        }}
      >
        <DayBadge icon={workout.icon} size={40} active={!isRestDay} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{workout.label}</p>
            {isOverridden && (
              <span
                style={{
                  fontSize: 10,
                  color: "var(--accent)",
                  background: "var(--accent-dim)",
                  border: "0.5px solid var(--accent-border)",
                  borderRadius: 20,
                  padding: "1px 8px",
                }}
              >
                Changed
              </span>
            )}
          </div>
          <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{workout.focus}</p>
        </div>
        {!isRestDay && (
          <button
            onClick={() => setShowDayPicker(true)}
            style={{
              background: "var(--bg-elevated)",
              border: "0.5px solid var(--border-default)",
              borderRadius: "var(--radius-sm)",
              color: "var(--text-secondary)",
              fontSize: 12,
              padding: "7px 12px",
              cursor: "pointer",
              fontFamily: "inherit",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            Change
          </button>
        )}
      </div>

      {!hasAnyLogs && (
        <div
          style={{
            background: "var(--bg-surface)",
            border: "0.5px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)",
            padding: "14px",
            marginBottom: 16,
          }}
        >
          <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 }}>
            First workout checklist
          </p>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 10 }}>
            Pick today&apos;s session, log at least one set, then save. You can also finish onboarding or review your program first.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link
              href="/onboarding"
              style={{
                textDecoration: "none",
                fontSize: 12,
                color: "var(--text-secondary)",
                border: "0.5px solid var(--border-default)",
                borderRadius: 20,
                padding: "6px 10px",
              }}
            >
              Finish onboarding
            </Link>
            <Link
              href="/program"
              style={{
                textDecoration: "none",
                fontSize: 12,
                color: "var(--text-secondary)",
                border: "0.5px solid var(--border-default)",
                borderRadius: 20,
                padding: "6px 10px",
              }}
            >
              Review program
            </Link>
          </div>
        </div>
      )}

      {isRestDay ? (
        <div
          style={{
            background: "var(--bg-surface)",
            border: "0.5px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)",
            padding: "32px 20px",
            textAlign: "center",
          }}
        >
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12, color: "var(--text-muted)" }}>
            <WorkoutIcon icon="rest" size={40} strokeWidth={1.2} />
          </div>
          <p style={{ fontSize: 15, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 }}>Rest Day</p>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
            No logging needed. Sleep well, eat your protein, and come back stronger tomorrow.
          </p>
          <button
            onClick={() => setShowDayPicker(true)}
            style={{
              marginTop: 16,
              background: "none",
              border: "0.5px solid var(--border-default)",
              borderRadius: "var(--radius-md)",
              color: "var(--text-secondary)",
              fontSize: 13,
              padding: "9px 20px",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            I trained anyway - change workout type
          </button>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {exerciseLogs.map((exLog, i) => {
              const template = workout.exercises.find((e) => e.id === exLog.exerciseId) ?? null
              return (
                <ExerciseCard
                  key={exLog.exerciseId}
                  exercise={template}
                  log={exLog}
                  logId={logId}
                  defaultOpen={i === 0}
                  onUpdate={(updated) => updateExerciseLog(exLog.exerciseId, updated)}
                  onRemove={() => removeExercise(exLog.exerciseId, !!exLog.isCustom)}
                />
              )
            })}

            {!showAddForm && (
              <RecentExercisesPicker
                recentExercises={recentExercises}
                onSelect={handleRecentPicked}
                title="Recent exercises"
              />
            )}

            {showAddForm ? (
              <AddExerciseForm
                onAdd={(ex) => {
                  if (!hasSentLogStarted) {
                    trackTelemetryEvent("log_started", {
                      date,
                      day_key: effectiveDayKey,
                      source: "add_exercise",
                    })
                    setHasSentLogStarted(true)
                  }
                  setExerciseLogs((prev) => [...prev, ex])
                  setPrefillRecent(null)
                  setShowAddForm(false)
                }}
                key={prefillRecent?.key ?? "custom-form"}
                recentExercises={recentExercises}
                initialRecent={prefillRecent}
                onCancel={() => {
                  setPrefillRecent(null)
                  setShowAddForm(false)
                }}
              />
            ) : (
              <button
                onClick={() => setShowAddForm(true)}
                style={{
                  background: "none",
                  border: "0.5px dashed var(--border-default)",
                  borderRadius: "var(--radius-lg)",
                  color: "var(--text-muted)",
                  fontSize: 13,
                  padding: "14px 0",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  fontFamily: "inherit",
                  width: "100%",
                }}
              >
                <IcoPlus /> Add exercise
              </button>
            )}
          </div>

          <button
            onClick={handleSave}
            style={{
              marginTop: 20,
              width: "100%",
              background: "var(--accent)",
              border: "none",
              borderRadius: "var(--radius-md)",
              color: "#fff",
              fontSize: 15,
              fontWeight: 500,
              padding: "14px 0",
              cursor: "pointer",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <IcoSave /> Save workout
          </button>
        </>
      )}

      {showDayPicker && (
        <DayOverridePicker current={effectiveDayKey} onSelect={handleDayOverride} onCancel={() => setShowDayPicker(false)} />
      )}
    </div>
  )
}

export default function LogPage() {
  return (
    <Suspense fallback={null}>
      <LogPageInner />
    </Suspense>
  )
}
