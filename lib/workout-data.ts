import { createClient } from "@/lib/supabase/client"

export type WorkoutIconKey =
  | "push"
  | "legs"
  | "recovery"
  | "pull"
  | "fire"
  | "hiit"
  | "rest"

export type DayKey =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday"

export interface Exercise {
  id: string
  name: string
  sets: number
  reps?: string
  duration?: string
  equipment?: string
  youtubeSearch: string
  tip: string
}

export interface WorkoutDay {
  label: string
  shortLabel: string
  icon: WorkoutIconKey
  type: "strength" | "cardio" | "recovery" | "hiit" | "rest"
  duration: string
  equipment: string
  focus: string
  exercises: Exercise[]
}

export type WorkoutPlan = Record<DayKey, WorkoutDay>

export interface SetEntry {
  setNumber: number
  weightKg?: number
  reps?: number
  durationSeconds?: number
}

export interface ExerciseLog {
  exerciseId: string
  exerciseName: string
  isCustom?: boolean
  isTimed?: boolean
  youtubeUrl?: string
  sets: SetEntry[]
  notes?: string
}

export interface WorkoutLog {
  id: string
  date: string
  dayKey: DayKey
  dayOverride?: DayKey
  skippedExerciseIds: string[]
  exercises: ExerciseLog[]
  completedAt: string
}

export const WORKOUT_PLAN: WorkoutPlan = {
  monday: {
    label: "Upper Body — Push",
    shortLabel: "Upper Push",
    icon: "push",
    type: "strength",
    duration: "45–55 min",
    equipment: "Smith + Dumbbells",
    focus: "Chest / Shoulders / Triceps",
    exercises: [
      {
        id: "mon-1",
        name: "Smith Incline Press",
        sets: 4,
        reps: "8–12",
        equipment: "Smith Machine",
        youtubeSearch: "smith+machine+incline+press+tutorial+form",
        tip: "Keep elbows at 45° from your body. Control the descent — 2 sec down, press up. Squeeze chest at the top.",
      },
      {
        id: "mon-2",
        name: "DB Flat Chest Press",
        sets: 3,
        reps: "10–12",
        equipment: "Dumbbells",
        youtubeSearch: "dumbbell+flat+bench+press+form+tutorial",
        tip: "Full range of motion — lower until elbows are level with chest. Neutral wrists, don't let them flare out.",
      },
      {
        id: "mon-3",
        name: "DB Lateral Raises",
        sets: 3,
        reps: "12–15",
        equipment: "Dumbbells",
        youtubeSearch: "dumbbell+lateral+raise+proper+form",
        tip: "Lead with your elbows, slight forward lean. Think of pouring water from a jug. Go light — form over weight.",
      },
      {
        id: "mon-4",
        name: "DB Overhead Press",
        sets: 3,
        reps: "10–12",
        equipment: "Dumbbells",
        youtubeSearch: "dumbbell+seated+overhead+shoulder+press+form",
        tip: "Core tight, don't arch your lower back. Press straight up, not forward. Lower to ear level each rep.",
      },
      {
        id: "mon-5",
        name: "Tricep Extension",
        sets: 3,
        reps: "12–15",
        equipment: "Rope / Cable",
        youtubeSearch: "rope+tricep+pushdown+cable+form",
        tip: "Keep elbows pinned to your sides — they should not move. Spread the rope at the bottom. Squeeze triceps fully.",
      },
      {
        id: "mon-6",
        name: "Jump Rope Warm-up",
        sets: 1,
        duration: "3–5 min",
        equipment: "Weighted Jump Rope",
        youtubeSearch: "jump+rope+warm+up+beginner+technique",
        tip: "Light pace — just raise your heart rate and warm the joints. Basic 2-foot jump, wrist rotation only.",
      },
    ],
  },

  tuesday: {
    label: "Lower Body",
    shortLabel: "Lower Body",
    icon: "legs",
    type: "strength",
    duration: "45–55 min",
    equipment: "Smith + Dumbbells",
    focus: "Quads / Glutes / Hamstrings",
    exercises: [
      {
        id: "tue-1",
        name: "Smith Back Squat",
        sets: 4,
        reps: "8–12",
        equipment: "Smith Machine",
        youtubeSearch: "smith+machine+back+squat+form+tutorial",
        tip: "Feet slightly forward of the bar. Keep chest up, knees track over toes. Go to parallel or below.",
      },
      {
        id: "tue-2",
        name: "DB Romanian Deadlift",
        sets: 3,
        reps: "10–12",
        equipment: "Dumbbells",
        youtubeSearch: "dumbbell+romanian+deadlift+rdl+form",
        tip: "Hinge at hips, slight knee bend. Dumbbells stay close to legs. Feel the hamstring stretch at the bottom.",
      },
      {
        id: "tue-3",
        name: "Walking Lunges",
        sets: 3,
        reps: "12 each leg",
        equipment: "Dumbbells",
        youtubeSearch: "dumbbell+walking+lunges+form",
        tip: "Big step forward, back knee hovers just above the floor. Keep torso upright. Drive through the front heel.",
      },
      {
        id: "tue-4",
        name: "Sumo Squat DB",
        sets: 3,
        reps: "12–15",
        equipment: "Dumbbells",
        youtubeSearch: "dumbbell+sumo+squat+wide+stance",
        tip: "Wide stance, toes pointed out ~45°. Targets inner thighs and glutes more than a regular squat.",
      },
      {
        id: "tue-5",
        name: "Calf Raises",
        sets: 3,
        reps: "15–20",
        equipment: "Bodyweight / Dumbbells",
        youtubeSearch: "standing+calf+raises+gym+form",
        tip: "Full range — all the way up and all the way down. Pause at the top for a 1-second squeeze. Go slow.",
      },
      {
        id: "tue-6",
        name: "Jump Rope Warm-up",
        sets: 1,
        duration: "3–5 min",
        equipment: "Weighted Jump Rope",
        youtubeSearch: "jump+rope+warm+up+beginner+technique",
        tip: "Light pace. Land softly on balls of feet, knees slightly bent. Don't slam flat-footed.",
      },
    ],
  },

  wednesday: {
    label: "Active Recovery",
    shortLabel: "Recovery",
    icon: "recovery",
    type: "recovery",
    duration: "20–30 min",
    equipment: "Treadmill + Jump Rope",
    focus: "Light Cardio + Mobility",
    exercises: [
      {
        id: "wed-1",
        name: "Treadmill Walk",
        sets: 1,
        duration: "15–20 min",
        equipment: "Treadmill",
        youtubeSearch: "treadmill+brisk+walk+incline+recovery",
        tip: "Brisk pace — you should be able to hold a conversation but feel warm. Add slight incline for extra burn.",
      },
      {
        id: "wed-2",
        name: "Jump Rope Basic",
        sets: 1,
        duration: "10–15 min",
        equipment: "Weighted Jump Rope",
        youtubeSearch: "basic+jump+rope+technique+rhythm+beginner",
        tip: "Alternate basic jumps and alternating feet. Rest when tired — this is active recovery, not HIIT.",
      },
      {
        id: "wed-3",
        name: "Full Body Stretching",
        sets: 1,
        duration: "10 min",
        equipment: "Bodyweight",
        youtubeSearch: "full+body+stretching+routine+gym+cool+down",
        tip: "Hold each stretch 30 sec. Focus on hips, hamstrings, chest, and shoulders.",
      },
    ],
  },

  thursday: {
    label: "Upper Body — Pull",
    shortLabel: "Upper Pull",
    icon: "pull",
    type: "strength",
    duration: "45–55 min",
    equipment: "Dumbbells + Smith",
    focus: "Back / Biceps / Rear Delts",
    exercises: [
      {
        id: "thu-1",
        name: "Smith Bent-Over Row",
        sets: 4,
        reps: "8–12",
        equipment: "Smith Machine",
        youtubeSearch: "smith+machine+bent+over+row+form",
        tip: "Hinge to ~45°, bar pulled to lower chest. Elbows drive back and up. Squeeze shoulder blades at the top.",
      },
      {
        id: "thu-2",
        name: "DB Single Arm Row",
        sets: 3,
        reps: "10–12 each",
        equipment: "Dumbbells",
        youtubeSearch: "dumbbell+single+arm+row+form+tutorial",
        tip: "Brace on bench, neutral spine. Pull elbow past your torso. Don't rotate your hips — isolate the back.",
      },
      {
        id: "thu-3",
        name: "DB Rear Delt Fly",
        sets: 3,
        reps: "12–15",
        equipment: "Dumbbells",
        youtubeSearch: "dumbbell+rear+delt+fly+bent+over",
        tip: "Hinge forward, slight bend in elbows. Lift arms out to the side — think hugging a barrel. Very light weight.",
      },
      {
        id: "thu-4",
        name: "DB Bicep Curls",
        sets: 3,
        reps: "10–12",
        equipment: "Dumbbells",
        youtubeSearch: "dumbbell+bicep+curl+proper+form",
        tip: "Keep elbows pinned at your sides. Supinate the wrist as you curl up. Full extension at the bottom.",
      },
      {
        id: "thu-5",
        name: "Hammer Curls",
        sets: 3,
        reps: "10–12",
        equipment: "Dumbbells",
        youtubeSearch: "dumbbell+hammer+curl+form+neutral+grip",
        tip: "Neutral grip (thumbs up) throughout. Targets brachialis and brachioradialis — gives arm thickness.",
      },
      {
        id: "thu-6",
        name: "Jump Rope Warm-up",
        sets: 1,
        duration: "3–5 min",
        equipment: "Weighted Jump Rope",
        youtubeSearch: "jump+rope+warm+up+shoulder+warm+up",
        tip: "Great shoulder warm-up before pull day. Keep it moderate — arms and shoulders will feel the rope weight.",
      },
    ],
  },

  friday: {
    label: "Full Body + Core",
    shortLabel: "Full Body",
    icon: "fire",
    type: "strength",
    duration: "50–60 min",
    equipment: "Smith + Dumbbells",
    focus: "Compound Lifts + Core",
    exercises: [
      {
        id: "fri-1",
        name: "Smith Deadlift",
        sets: 4,
        reps: "6–10",
        equipment: "Smith Machine",
        youtubeSearch: "smith+machine+deadlift+form+tutorial",
        tip: "Brace core before every rep. Hips and bar rise together. Reset between reps.",
      },
      {
        id: "fri-2",
        name: "DB Goblet Squat",
        sets: 3,
        reps: "12–15",
        equipment: "Dumbbells",
        youtubeSearch: "dumbbell+goblet+squat+form",
        tip: "Hold DB at chest, elbows inside knees as you descend. Great for quad activation and core bracing.",
      },
      {
        id: "fri-3",
        name: "Dead Bug",
        sets: 3,
        reps: "10 each side",
        equipment: "Bodyweight",
        youtubeSearch: "dead+bug+exercise+core+form+tutorial",
        tip: "Press lower back INTO the floor the entire time. Move opposite arm + leg slowly.",
      },
      {
        id: "fri-4",
        name: "Plank Hold",
        sets: 3,
        duration: "30–60 sec",
        equipment: "Bodyweight",
        youtubeSearch: "plank+hold+proper+form+core",
        tip: "Straight line from head to heels. Squeeze glutes + abs. Don't let hips sag or pike.",
      },
      {
        id: "fri-5",
        name: "Bicycle Crunches",
        sets: 3,
        reps: "20",
        equipment: "Bodyweight",
        youtubeSearch: "bicycle+crunches+proper+form+abs",
        tip: "Slow and controlled — don't rush. Elbow to opposite knee, full rotation. Keep lower back to floor.",
      },
      {
        id: "fri-6",
        name: "Leg Raises",
        sets: 3,
        reps: "12–15",
        equipment: "Bodyweight",
        youtubeSearch: "lying+leg+raises+lower+abs+form",
        tip: "Hands under lower back for support. Lower legs slowly without touching the floor. Exhale on the way up.",
      },
      {
        id: "fri-7",
        name: "Jump Rope Warm-up",
        sets: 1,
        duration: "3–5 min",
        equipment: "Weighted Jump Rope",
        youtubeSearch: "jump+rope+warm+up+beginner+technique",
        tip: "Light pace to warm up before heavy compound lifts. Don't burn out here.",
      },
    ],
  },

  saturday: {
    label: "HIIT + Jump Rope",
    shortLabel: "HIIT",
    icon: "hiit",
    type: "hiit",
    duration: "25–30 min",
    equipment: "Treadmill + Jump Rope",
    focus: "Fat Burn + Cardio Endurance",
    exercises: [
      {
        id: "sat-1",
        name: "Treadmill Warm-up",
        sets: 1,
        duration: "5 min",
        equipment: "Treadmill",
        youtubeSearch: "treadmill+warm+up+walk+to+jog",
        tip: "Start at easy walk, gradually increase to light jog. Get heart rate to ~120 bpm.",
      },
      {
        id: "sat-2",
        name: "HIIT Intervals",
        sets: 8,
        duration: "30 sec on / 30 sec off",
        equipment: "Treadmill",
        youtubeSearch: "treadmill+hiit+intervals+sprint+walking",
        tip: "Sprint at a challenging pace — 7–9 on effort scale. Full recovery walk between sets.",
      },
      {
        id: "sat-3",
        name: "Jump Rope Intervals",
        sets: 5,
        duration: "45 sec / 60 sec rest",
        equipment: "Weighted Jump Rope",
        youtubeSearch: "jump+rope+hiit+intervals+workout",
        tip: "High knees, alternating feet. This is your best fat burner. Embrace the burn.",
      },
      {
        id: "sat-4",
        name: "Cool-down",
        sets: 1,
        duration: "5 min",
        equipment: "Bodyweight",
        youtubeSearch: "cool+down+stretching+after+hiit+cardio",
        tip: "Slow walk + light stretches. Never skip this — brings heart rate down safely.",
      },
    ],
  },

  sunday: {
    label: "Rest Day",
    shortLabel: "Rest",
    icon: "rest",
    type: "rest",
    duration: "—",
    equipment: "—",
    focus: "Sleep · Recover · Eat Well",
    exercises: [],
  },
}

export const NUTRITION = {
  proteinTarget: { min: 100, max: 110, unit: "g/day" },
  caloricDeficit: { min: 300, max: 400, unit: "kcal/day" },
  water: { min: 2.5, max: 3, unit: "L/day" },
  postWorkoutWindow: "1–2 hrs",
} as const

const DAY_KEYS: DayKey[] = [
  "sunday", "monday", "tuesday", "wednesday",
  "thursday", "friday", "saturday",
]

export function getTodayKey(): DayKey {
  return DAY_KEYS[new Date().getDay()]
}

export function getDayKey(date: Date): DayKey {
  return DAY_KEYS[date.getDay()]
}

export function getDayKeyFromStr(dateStr: string): DayKey {
  const [y, m, d] = dateStr.split("-").map(Number)
  return DAY_KEYS[new Date(y, m - 1, d).getDay()]
}

export function buildYoutubeUrl(search: string): string {
  return `https://www.youtube.com/results?search_query=${search}`
}

const STORAGE_KEY = "workout_logs_v2"

type SetEntryRow = {
  set_number: number
  weight_kg: number | null
  reps: number | null
  duration_seconds: number | null
}

type ExerciseLogRow = {
  id: string
  workout_log_id: string
  exercise_id: string
  exercise_name: string
  is_custom: boolean | null
  is_timed: boolean | null
  notes: string | null
  order_index: number | null
  set_entries: SetEntryRow[] | null
}

type WorkoutLogRow = {
  id: string
  user_id: string
  date: string
  day_key: DayKey
  day_override: DayKey | null
  skipped_exercise_ids: string[] | null
  completed_at: string
  exercise_logs: ExerciseLogRow[] | null
}

let logsCache: WorkoutLog[] = []
let hydrated = false
let hydratingPromise: Promise<WorkoutLog[]> | null = null
let workoutLogsSupportsProgramColumns: boolean | null = null
let workoutDetailsSyncSupported: boolean | null = null

function emitLogsUpdated() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event("workout-logs-updated"))
}

function reportSyncError(scope: string, error: unknown) {
  console.error(`[workout-log-sync:${scope}]`, error)
}

function isMissingColumnError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false
  const maybeCode = (error as { code?: unknown }).code
  return maybeCode === "PGRST204"
}

function normalizeLogs(logs: WorkoutLog[]): WorkoutLog[] {
  return logs
    .map((l) => ({
      ...l,
      skippedExerciseIds: l.skippedExerciseIds ?? [],
      exercises: l.exercises.map((ex) => ({
        ...ex,
        sets: ex.sets.slice().sort((a, b) => a.setNumber - b.setNumber),
      })),
    }))
    .sort((a, b) => b.date.localeCompare(a.date))
}

function mapRowToLog(row: WorkoutLogRow): WorkoutLog {
  const exercises = (row.exercise_logs ?? [])
    .slice()
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
    .map((exercise) => ({
      exerciseId: exercise.exercise_id,
      exerciseName: exercise.exercise_name,
      isCustom: !!exercise.is_custom,
      isTimed: !!exercise.is_timed,
      notes: exercise.notes ?? "",
      sets: (exercise.set_entries ?? [])
        .slice()
        .sort((a, b) => a.set_number - b.set_number)
        .map((setRow) => ({
          setNumber: setRow.set_number,
          weightKg: setRow.weight_kg ?? undefined,
          reps: setRow.reps ?? undefined,
          durationSeconds: setRow.duration_seconds ?? undefined,
        })),
    }))

  return {
    id: row.id,
    date: row.date,
    dayKey: row.day_key,
    dayOverride: row.day_override ?? undefined,
    skippedExerciseIds: row.skipped_exercise_ids ?? [],
    exercises,
    completedAt: row.completed_at,
  }
}

function persistCacheToLocalStorage() {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logsCache))
  } catch {
    // Ignore local cache persistence failures.
  }
}

function loadLocalCache() {
  if (typeof window === "undefined") return
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as WorkoutLog[]
    logsCache = normalizeLogs(parsed)
  } catch {
    logsCache = []
  }
}

async function hydrateLogsFromSupabase(force = false): Promise<WorkoutLog[]> {
  if (typeof window === "undefined") return []
  if (hydrated && !force) return logsCache
  if (hydratingPromise && !force) return hydratingPromise

  hydratingPromise = (async () => {
    try {
      const supabase = createClient()
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData.user) {
        hydrated = true
        return logsCache
      }

      const { data, error } = await supabase
        .from("workout_logs")
        .select(`
          id,
          user_id,
          date,
          day_key,
          day_override,
          skipped_exercise_ids,
          completed_at,
          exercise_logs (
            id,
            workout_log_id,
            exercise_id,
            exercise_name,
            is_custom,
            is_timed,
            notes,
            order_index,
            set_entries (
              set_number,
              weight_kg,
              reps,
              duration_seconds
            )
          )
        `)
        .eq("user_id", userData.user.id)
        .order("date", { ascending: false })

      if (error) throw error

      logsCache = normalizeLogs(((data ?? []) as WorkoutLogRow[]).map(mapRowToLog))
      hydrated = true
      persistCacheToLocalStorage()
      emitLogsUpdated()
      return logsCache
    } catch {
      hydrated = true
      return logsCache
    } finally {
      hydratingPromise = null
    }
  })()

  return hydratingPromise
}

async function saveLogToSupabase(log: WorkoutLog): Promise<void> {
  if (typeof window === "undefined") return
  const supabase = createClient()
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) return

  const userId = userData.user.id

  const upsertWithProgramColumns = async () => {
    return supabase.from("workout_logs").upsert({
      id: log.id,
      user_id: userId,
      date: log.date,
      day_key: log.dayKey,
      day_override: log.dayOverride ?? null,
      skipped_exercise_ids: log.skippedExerciseIds,
      completed_at: log.completedAt,
    })
  }

  const upsertLegacyColumns = async () => {
    return supabase.from("workout_logs").upsert({
      id: log.id,
      user_id: userId,
      date: log.date,
      completed_at: log.completedAt,
    })
  }

  if (workoutLogsSupportsProgramColumns === false) {
    const { error: legacyError } = await upsertLegacyColumns()
    if (legacyError) throw legacyError
  } else {
    const { error: upsertError } = await upsertWithProgramColumns()
    if (upsertError) {
      if (isMissingColumnError(upsertError)) {
        workoutLogsSupportsProgramColumns = false
        const { error: legacyError } = await upsertLegacyColumns()
        if (legacyError) throw legacyError
      } else {
        throw upsertError
      }
    } else {
      workoutLogsSupportsProgramColumns = true
    }
  }

  // Older schemas may not support detailed child rows in exercise_logs/set_entries.
  // In that case, keep parent workout_logs sync and skip child sync to avoid noisy errors.
  if (workoutDetailsSyncSupported === false) {
    return
  }

  try {
    // Replace children atomically-ish by deleting previous exercise logs then re-inserting.
    const { data: existingExercises } = await supabase
      .from("exercise_logs")
      .select("id")
      .eq("workout_log_id", log.id)

    const exerciseLogIds = (existingExercises ?? []).map((e) => e.id as string)

    if (exerciseLogIds.length > 0) {
      await supabase.from("set_entries").delete().in("exercise_log_id", exerciseLogIds)
      await supabase.from("exercise_logs").delete().eq("workout_log_id", log.id)
    }

    for (let i = 0; i < log.exercises.length; i++) {
      const exercise = log.exercises[i]
      const { data: insertedExercise, error: exerciseError } = await supabase
        .from("exercise_logs")
        .insert({
          workout_log_id: log.id,
          exercise_id: exercise.exerciseId,
          exercise_name: exercise.exerciseName,
          is_custom: !!exercise.isCustom,
          is_timed: !!exercise.isTimed,
          notes: exercise.notes ?? null,
          order_index: i,
        })
        .select("id")
        .single()

      if (exerciseError || !insertedExercise?.id) {
        throw exerciseError ?? new Error("Failed to insert exercise log")
      }

      if (exercise.sets.length > 0) {
        const rows = exercise.sets.map((set) => ({
          exercise_log_id: insertedExercise.id,
          set_number: set.setNumber,
          weight_kg: set.weightKg ?? null,
          reps: set.reps ?? null,
          duration_seconds: set.durationSeconds ?? null,
        }))

        const { error: setError } = await supabase.from("set_entries").insert(rows)
        if (setError) throw setError
      }
    }

    workoutDetailsSyncSupported = true
  } catch (error) {
    if (isMissingColumnError(error)) {
      workoutDetailsSyncSupported = false
      return
    }

    throw error
  }
}

async function deleteLogFromSupabase(id: string): Promise<void> {
  if (typeof window === "undefined") return
  const supabase = createClient()
  const { data: existingExercises } = await supabase
    .from("exercise_logs")
    .select("id")
    .eq("workout_log_id", id)

  const exerciseLogIds = (existingExercises ?? []).map((e) => e.id as string)
  if (exerciseLogIds.length > 0) {
    await supabase.from("set_entries").delete().in("exercise_log_id", exerciseLogIds)
    await supabase.from("exercise_logs").delete().eq("workout_log_id", id)
  }

  await supabase.from("workout_logs").delete().eq("id", id)
}

// Keep signature unchanged for legacy callers.
export function savelog(log: WorkoutLog): void {
  if (!hydrated) loadLocalCache()

  const existing = [...logsCache]
  const idx = existing.findIndex((l) => l.date === log.date && l.dayKey === log.dayKey)
  if (idx >= 0) {
    existing[idx] = log
  } else {
    existing.push(log)
  }

  logsCache = normalizeLogs(existing)
  persistCacheToLocalStorage()
  emitLogsUpdated()

  void saveLogToSupabase(log).catch((error) => {
    reportSyncError("save", error)
  })
}

// Keep signature unchanged for legacy callers.
export function getLogs(): WorkoutLog[] {
  if (typeof window === "undefined") return []
  if (!hydrated) {
    loadLocalCache()
    void hydrateLogsFromSupabase()
  }
  return logsCache
}

// Keep signature unchanged for legacy callers.
export function getLogByDate(date: string): WorkoutLog | undefined {
  return getLogs().find((l) => l.date === date)
}

// Keep signature unchanged for legacy callers.
export function deleteLog(id: string): void {
  if (!hydrated) loadLocalCache()
  logsCache = logsCache.filter((l) => l.id !== id)
  persistCacheToLocalStorage()
  emitLogsUpdated()

  void deleteLogFromSupabase(id).catch((error) => {
    reportSyncError("delete", error)
  })
}

// Async helpers for new async-aware hooks.
export async function getLogsAsync(force = false): Promise<WorkoutLog[]> {
  if (!hydrated) loadLocalCache()
  return hydrateLogsFromSupabase(force)
}

export async function getLogByDateAsync(date: string): Promise<WorkoutLog | undefined> {
  const logs = await getLogsAsync()
  return logs.find((l) => l.date === date)
}

export async function savelogAsync(log: WorkoutLog): Promise<void> {
  await saveLogToSupabase(log)
}

export async function deleteLogAsync(id: string): Promise<void> {
  await deleteLogFromSupabase(id)
}