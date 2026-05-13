import type { DayKey, WorkoutLog } from "./workout-data"

export type Role = "user" | "assistant"

export interface Message {
  id: string
  role: Role
  content: string
  error?: boolean
}

export type PersonalBest = {
  exerciseId: string
  exerciseName: string
  weightKg: number
  reps: number
  date: string
  dayKey: DayKey
}

export type CalendarDay = {
  dateStr: string
  dayOfMonth: number
  isCurrentMonth: boolean
  isToday: boolean
  log: WorkoutLog | null
}
