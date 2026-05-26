import { createClient } from "@/lib/supabase/client"
import { type DayKey, type ExerciseLog, type WorkoutDay, type WorkoutIconKey } from "@/lib/workout-data"

type ProgramExerciseRow = {
  id: string
  name: string
  sets: number
  reps: string | null
  duration_label: string | null
  is_timed: boolean
  equipment: string | null
  order_index: number
}

type ProgramDayRow = {
  day_key: DayKey
  label: string
  short_label: string
  icon_key: string
  focus: string | null
  equipment: string | null
  duration: string | null
  is_rest: boolean
  program_exercises: ProgramExerciseRow[] | null
}

const ICON_FALLBACK_BY_DAY: Record<DayKey, WorkoutIconKey> = {
  monday: "push",
  tuesday: "legs",
  wednesday: "recovery",
  thursday: "pull",
  friday: "fire",
  saturday: "hiit",
  sunday: "rest",
}

function toWorkoutDay(row: ProgramDayRow): WorkoutDay {
  const icon = (row.icon_key || ICON_FALLBACK_BY_DAY[row.day_key]) as WorkoutIconKey
  const sortedExercises = (row.program_exercises ?? [])
    .slice()
    .sort((a, b) => a.order_index - b.order_index)

  return {
    label: row.label,
    shortLabel: row.short_label,
    icon: row.is_rest ? "rest" : icon,
    type: row.is_rest ? "rest" : "strength",
    duration: row.duration ?? "",
    equipment: row.equipment ?? "",
    focus: row.focus ?? "",
    exercises: sortedExercises.map((exercise) => ({
      id: exercise.id,
      name: exercise.name,
      sets: exercise.sets,
      reps: exercise.reps ?? undefined,
      duration: exercise.duration_label ?? undefined,
      equipment: exercise.equipment ?? undefined,
      youtubeSearch: "",
      tip: "",
    })),
  }
}

export async function fetchUserProgramByDay(): Promise<Partial<Record<DayKey, WorkoutDay>>> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return {}

  const { data } = await supabase
    .from("program_days")
    .select(
      `
        day_key,
        label,
        short_label,
        icon_key,
        focus,
        equipment,
        duration,
        is_rest,
        program_exercises (
          id,
          name,
          sets,
          reps,
          duration_label,
          is_timed,
          equipment,
          order_index
        )
      `
    )
    .eq("user_id", user.id)

  if (!data) return {}

  const mapped: Partial<Record<DayKey, WorkoutDay>> = {}
  for (const row of data as ProgramDayRow[]) {
    mapped[row.day_key] = toWorkoutDay(row)
  }

  return mapped
}

export function createExerciseLogsFromWorkoutDay(day: WorkoutDay): ExerciseLog[] {
  return day.exercises.map((exercise) => ({
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    isCustom: false,
    isTimed: !!(exercise.duration && !exercise.reps),
    sets: Array.from({ length: exercise.sets }, (_, i) => ({
      setNumber: i + 1,
      weightKg: undefined,
      reps: undefined,
      durationSeconds: undefined,
    })),
    notes: "",
  }))
}
