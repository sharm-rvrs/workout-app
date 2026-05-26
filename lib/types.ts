import type { DayKey, WorkoutLog } from "./workout-data"

export type Goal =
  | "recomp"
  | "lose_fat"
  | "build_muscle"
  | "maintain"
  | "endurance"

export type FitnessLevel = "beginner" | "intermediate" | "advanced"

export interface PendingSignupProfile {
  email: string
  fullName: string
  birthday: string | null
  age: number | null
  weightKg: number | null
  heightCm: number | null
  goal: Goal
  fitnessLevel: FitnessLevel
}

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
