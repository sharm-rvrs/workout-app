/**
 * lib/workoutLogContext.ts
 *
 * Reads localStorage logs and builds a plain-text summary
 * the AI can read and reference.
 */

import { getLogs, WORKOUT_PLAN, type WorkoutLog } from "@/lib/workout-data"
import { formatDateFull, todayStrPH } from "@/lib/dates"

// How many past sessions to include (besides today)
const HISTORY_SESSIONS = 6

function formatSets(log: WorkoutLog): string {
  const lines: string[] = []

  for (const ex of log.exercises) {
    const filledSets = ex.sets.filter(
      (s) => s.weightKg != null || s.reps != null || s.durationSeconds != null
    )
    if (filledSets.length === 0) continue

    const setStrs = filledSets.map((s) => {
      if (s.durationSeconds != null) {
        const mins = Math.floor(s.durationSeconds / 60)
        const secs = s.durationSeconds % 60
        return mins > 0 ? `${mins}m ${secs}s` : `${s.durationSeconds}s`
      }
      return `${s.weightKg ?? "—"}kg × ${s.reps ?? "—"} reps`
    })

    const label = ex.isCustom ? `${ex.exerciseName} (custom)` : ex.exerciseName
    lines.push(`  • ${label}: ${setStrs.join(" | ")}`)
    if (ex.notes) lines.push(`    Note: ${ex.notes}`)
  }

  return lines.join("\n")
}

export default function buildWorkoutLogContext(): string {
  if (typeof window === "undefined") return ""

  const allLogs = getLogs()
  if (allLogs.length === 0) return "No workouts logged yet."

  const sorted = [...allLogs].sort((a, b) => b.date.localeCompare(a.date))
  const todayStr = todayStrPH()

  const todayLog = sorted.find((l) => l.date === todayStr)
  const historyLogs = sorted.filter((l) => l.date !== todayStr).slice(0, HISTORY_SESSIONS)

  const parts: string[] = []

  // Today's log
  if (todayLog) {
    const workout = WORKOUT_PLAN[todayLog.dayOverride ?? todayLog.dayKey]
    const sets = formatSets(todayLog)
    parts.push(`TODAY'S LOG (${todayStr} — ${workout.label}):\n` + (sets || "  No sets logged yet."))
  } else {
    parts.push(`TODAY (${todayStr}): No workout logged yet.`)
  }

  // Recent history
  if (historyLogs.length > 0) {
    parts.push("\nRECENT HISTORY (last sessions):")
    for (const log of historyLogs) {
      const workout = WORKOUT_PLAN[log.dayOverride ?? log.dayKey]
      const sets = formatSets(log)
      parts.push(`\n${formatDateFull(log.date)} — ${workout.label}:\n` + (sets || "  No sets data."))
    }
  }

  // Personal bests (top 8 by weight)
  const pbMap = new Map<string, { name: string; kg: number; reps: number; date: string }>()
  for (const log of allLogs) {
    for (const ex of log.exercises) {
      for (const s of ex.sets) {
        if (!s.weightKg) continue
        const existing = pbMap.get(ex.exerciseId)
        if (!existing || s.weightKg > existing.kg) {
          pbMap.set(ex.exerciseId, {
            name: ex.exerciseName,
            kg: s.weightKg,
            reps: s.reps ?? 0,
            date: log.date,
          })
        }
      }
    }
  }

  const topPBs = Array.from(pbMap.values())
    .sort((a, b) => b.kg - a.kg)
    .slice(0, 8)

  if (topPBs.length > 0) {
    parts.push("\nPERSONAL BESTS:")
    for (const pb of topPBs) {
      parts.push(`  • ${pb.name}: ${pb.kg}kg × ${pb.reps} reps (${pb.date})`)
    }
  }

  return parts.join("\n")
}
