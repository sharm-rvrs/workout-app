"use client"

import { useState, useEffect, useCallback } from "react"
import {
  getLogs,
  savelog,
  deleteLog,
  WORKOUT_PLAN,
  type WorkoutLog,
  type ExerciseLog,
  type DayKey,
} from "@/lib/workout-data"
                      
export function useWorkoutLog() {
  const [logs, setLogs] = useState<WorkoutLog[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setLogs(getLogs())
    setIsLoaded(true)
  }, [])

  const save = useCallback((log: WorkoutLog) => {
    savelog(log)
    setLogs(getLogs())
  }, [])

  const remove = useCallback((id: string) => {
    deleteLog(id)
    setLogs(getLogs())
  }, [])

  const getByDate = useCallback(
    (date: string) => logs.find((l) => l.date === date),
    [logs]
  )

  return { logs, isLoaded, save, remove, getByDate }
}

export function useStreak() {
  const [streak, setStreak] = useState(0)

  useEffect(() => {
    const logs = getLogs()
    if (logs.length === 0) { setStreak(0); return }

    const loggedDates = new Set(logs.map((l) => l.date))
    let count = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let i = 0; i < 365; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      if (d.getDay() === 0) continue // skip Sundays
      const key = d.toISOString().split("T")[0]
      if (loggedDates.has(key)) {
        count++
      } else if (i > 0) {
        break
      }
    }
    setStreak(count)
  }, [])

  return streak
}

export type PersonalBest = {
  exerciseId: string
  exerciseName: string
  weightKg: number
  reps: number
  date: string
}

export function usePersonalBests(): PersonalBest[] {
  const [bests, setBests] = useState<PersonalBest[]>([])

  useEffect(() => {
    const logs = getLogs()
    const map = new Map<string, PersonalBest>()

    for (const log of logs) {
      for (const ex of log.exercises) {
        for (const set of ex.sets) {
          if (!set.weightKg) continue
          const existing = map.get(ex.exerciseId)
          if (!existing || set.weightKg > existing.weightKg) {
            map.set(ex.exerciseId, {
              exerciseId: ex.exerciseId,
              exerciseName: ex.exerciseName,
              weightKg: set.weightKg,
              reps: set.reps ?? 0,
              date: log.date,
            })
          }
        }
      }
    }
    setBests(Array.from(map.values()))
  }, [])

  return bests
}

export function useCurrentWeek(): number {
  const [week, setWeek] = useState(1)

  useEffect(() => {
    const logs = getLogs()
    if (logs.length === 0) { setWeek(1); return }
    const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date))
    const firstDate = new Date(sorted[0].date)
    const diffDays = Math.floor(
      (Date.now() - firstDate.getTime()) / (1000 * 60 * 60 * 24)
    )
    setWeek(Math.min(12, Math.floor(diffDays / 7) + 1))
  }, [])

  return week
}


export function createNewLog(date: string, dayKey: DayKey): WorkoutLog {
  const day = WORKOUT_PLAN[dayKey]

  const exercises: ExerciseLog[] = day.exercises.map((ex) => ({
    exerciseId: ex.id,
    exerciseName: ex.name,
    isCustom: false,
    sets: Array.from({ length: ex.sets }, (_, i) => ({
      setNumber: i + 1,
      weightKg: undefined,
      reps: undefined,
      durationSeconds: undefined,
    })),
    notes: "",
  }))

  return {
    id: crypto.randomUUID(),
    date,
    dayKey,
    dayOverride: undefined,
    skippedExerciseIds: [],
    exercises,
    completedAt: new Date().toISOString(),
  }
}