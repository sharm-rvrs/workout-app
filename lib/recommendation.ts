export type RecommendationProfile = {
  user_id?: string
  full_name?: string | null
  age?: number | null
  weight_kg?: number | null
  height_cm?: number | null
  goal?: string | null
  fitness_level?: string | null
}

export type RecommendationExercise = {
  name: string
  sets: number
  reps?: string | null
  duration_label?: string | null
  is_timed: boolean
  equipment?: string | null
}

export type RecommendationProgramDay = {
  day_key: string
  label: string | null
  focus: string | null
  duration: string | null
  is_rest: boolean
  program_exercises: RecommendationExercise[] | null
}

export type WeeklySeriesDay = {
  day_key: string
  label: string
  focus: string
  duration: string
  is_rest: boolean
  exercises: string[]
}

export type RecommendationResponse = {
  recommendation: string
  weekly_series: WeeklySeriesDay[]
  source: "ai" | "fallback"
  profile?: RecommendationProfile
}

const DAY_ORDER = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]

const TRAINING_DAY_KEYS: Record<number, string[]> = {
  3: ["monday", "wednesday", "friday"],
  4: ["monday", "tuesday", "thursday", "saturday"],
  5: ["monday", "tuesday", "thursday", "friday", "saturday"],
  6: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
}

const GOAL_SPLITS: Record<string, string[]> = {
  build_muscle: [
    "Upper Push",
    "Lower Body",
    "Upper Pull",
    "Full Body",
    "Lower + Core",
    "Conditioning",
  ],
  lose_fat: [
    "Full Body Strength",
    "Interval Conditioning",
    "Upper Body Strength",
    "Zone 2 Cardio + Core",
    "Lower Body Strength",
    "Conditioning Circuit",
  ],
  recomp: [
    "Upper Strength",
    "Lower Strength",
    "Conditioning + Core",
    "Upper Hypertrophy",
    "Lower Hypertrophy",
    "HIIT Finisher",
  ],
  maintain: [
    "Upper Body",
    "Lower Body",
    "Conditioning",
    "Full Body",
    "Mobility + Core",
    "Optional Cardio",
  ],
  endurance: [
    "Aerobic Base",
    "Upper Strength",
    "Tempo Intervals",
    "Lower Strength",
    "Long Cardio Session",
    "Recovery Cardio + Core",
  ],
}

const FOCUS_EXERCISES: Record<string, string[]> = {
  "Upper Push": ["Incline Press", "Overhead Press", "Lateral Raise", "Triceps Extension"],
  "Lower Body": ["Back Squat", "Romanian Deadlift", "Walking Lunge", "Calf Raise"],
  "Upper Pull": ["Bent-over Row", "Single-arm Row", "Rear Delt Fly", "Hammer Curl"],
  "Full Body": ["Goblet Squat", "Chest Press", "Row", "Plank"],
  "Lower + Core": ["Split Squat", "Hip Hinge", "Leg Curl", "Dead Bug"],
  Conditioning: ["Jump Rope", "Bike Intervals", "Bodyweight Circuit", "Core Finisher"],
  "Full Body Strength": ["Squat", "Press", "Row", "Core Circuit"],
  "Interval Conditioning": ["HIIT Bike", "Jump Rope", "Burpee Flow", "Cooldown Walk"],
  "Upper Body Strength": ["Bench Press", "Row", "Shoulder Press", "Arms Superset"],
  "Zone 2 Cardio + Core": ["Incline Walk", "Rower", "Plank Series", "Mobility"],
  "Lower Body Strength": ["Deadlift", "Lunge", "Leg Press", "Calf Raise"],
  "Conditioning Circuit": ["Kettlebell Swing", "Step-ups", "Jump Rope", "Core Flow"],
  "Upper Strength": ["Press", "Row", "Pull-down", "Arms Finisher"],
  "Lower Strength": ["Squat", "RDL", "Lunge", "Core"],
  "Conditioning + Core": ["Treadmill Intervals", "Jump Rope", "Cable Crunch", "Stretch"],
  "Upper Hypertrophy": ["Incline Press", "Lat Pull-down", "Lateral Raise", "Biceps Curl"],
  "Lower Hypertrophy": ["Leg Press", "Hamstring Curl", "Bulgarian Split Squat", "Calf Raise"],
  "HIIT Finisher": ["Bike Sprints", "Jump Squat", "Mountain Climber", "Cooldown"],
  "Upper Body": ["Press", "Row", "Shoulders", "Arms"],
  "Mobility + Core": ["Mobility Flow", "Bird Dog", "Side Plank", "Stretch"],
  "Optional Cardio": ["Brisk Walk", "Cycle", "Easy Rope", "Stretch"],
  "Aerobic Base": ["Zone 2 Cardio", "Cadence Drill", "Core", "Mobility"],
  "Tempo Intervals": ["Tempo Run", "Rower Intervals", "Cooldown Walk", "Stretch"],
  "Long Cardio Session": ["Long Run or Ride", "Core Stability", "Mobility", "Breathing"],
  "Recovery Cardio + Core": ["Easy Cardio", "Plank", "Dead Bug", "Stretch"],
}

function toGoal(goal: string | null | undefined): string {
  if (!goal) return "recomp"
  if (goal in GOAL_SPLITS) return goal
  return "recomp"
}

function toLevel(level: string | null | undefined): "beginner" | "intermediate" | "advanced" {
  if (level === "advanced") return "advanced"
  if (level === "intermediate") return "intermediate"
  return "beginner"
}

function levelDuration(level: "beginner" | "intermediate" | "advanced"): string {
  if (level === "advanced") return "55-70 min"
  if (level === "intermediate") return "45-60 min"
  return "35-45 min"
}

function getTrainingDays(profile: RecommendationProfile, programDays: RecommendationProgramDay[]): number {
  const existing = programDays.filter((day) => !day.is_rest).length
  if (existing >= 3 && existing <= 6) return existing

  const level = toLevel(profile.fitness_level)
  if (level === "advanced") return 6
  if (level === "intermediate") return 5
  return 4
}

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim()
}

function scoreProgramDay(day: RecommendationProgramDay, focus: string): number {
  const source = normalizeKey(`${day.label ?? ""} ${day.focus ?? ""}`)
  const parts = normalizeKey(focus).split(" ")
  let score = 0
  for (const part of parts) {
    if (part.length < 3) continue
    if (source.includes(part)) score += 1
  }
  return score
}

function pickExercisesForFocus(focus: string, day: RecommendationProgramDay | undefined): string[] {
  const fromProgram = (day?.program_exercises ?? [])
    .map((exercise) => exercise.name?.trim())
    .filter((name): name is string => Boolean(name))

  if (fromProgram.length > 0) {
    return fromProgram.slice(0, 4)
  }

  return (FOCUS_EXERCISES[focus] ?? ["Compound Lift", "Accessory Lift", "Core", "Cooldown"]).slice(0, 4)
}

export function buildDeterministicWeeklySeries(
  profile: RecommendationProfile,
  programDays: RecommendationProgramDay[]
): WeeklySeriesDay[] {
  const goal = toGoal(profile.goal)
  const level = toLevel(profile.fitness_level)
  const trainingDays = getTrainingDays(profile, programDays)
  const activeDayKeys = TRAINING_DAY_KEYS[trainingDays] ?? TRAINING_DAY_KEYS[4]
  const split = GOAL_SPLITS[goal]

  const matchedProgramDays = [...programDays].sort((a, b) => a.day_key.localeCompare(b.day_key))

  return DAY_ORDER.map((dayKey, index) => {
    if (!activeDayKeys.includes(dayKey)) {
      return {
        day_key: dayKey,
        label: "Rest / Recovery",
        focus: "Recovery",
        duration: "20-30 min optional walk",
        is_rest: true,
        exercises: ["Walk", "Mobility", "Breathing"],
      }
    }

    const focus = split[index % split.length]
    const bestProgramDay = matchedProgramDays
      .filter((day) => !day.is_rest)
      .sort((a, b) => scoreProgramDay(b, focus) - scoreProgramDay(a, focus))[0]

    return {
      day_key: dayKey,
      label: focus,
      focus,
      duration: bestProgramDay?.duration ?? levelDuration(level),
      is_rest: false,
      exercises: pickExercisesForFocus(focus, bestProgramDay),
    }
  })
}

export function buildFallbackRecommendation(
  profile: RecommendationProfile,
  weeklySeries: WeeklySeriesDay[]
): string {
  const goal = toGoal(profile.goal)
  const level = toLevel(profile.fitness_level)
  const trainingDays = weeklySeries.filter((day) => !day.is_rest).length
  const firstName = (profile.full_name ?? "").trim().split(" ")[0]
  const namePrefix = firstName ? `${firstName}, ` : ""

  return `${namePrefix}your plan is tailored for ${goal.replace(/_/g, " ")} at a ${level} level. You have ${trainingDays} focused training days this week with built-in recovery days to keep progress sustainable. Prioritize controlled reps and progressive overload on strength-focused sessions, then push pace on conditioning days. Keep sessions consistent for 2-3 weeks before making major changes.`
}

export function isValidRecommendationShape(response: unknown): response is RecommendationResponse {
  if (!response || typeof response !== "object") return false
  const value = response as RecommendationResponse

  if (typeof value.recommendation !== "string" || value.recommendation.trim().length === 0) {
    return false
  }

  if (value.source !== "ai" && value.source !== "fallback") {
    return false
  }

  if (!Array.isArray(value.weekly_series) || value.weekly_series.length !== 7) {
    return false
  }

  if (value.profile !== undefined) {
    if (!value.profile || typeof value.profile !== "object") {
      return false
    }

    const profile = value.profile as RecommendationProfile
    if (profile.user_id !== undefined && typeof profile.user_id !== "string") return false
    if (profile.full_name !== undefined && profile.full_name !== null && typeof profile.full_name !== "string") return false
    if (profile.age !== undefined && profile.age !== null && typeof profile.age !== "number") return false
    if (profile.weight_kg !== undefined && profile.weight_kg !== null && typeof profile.weight_kg !== "number") return false
    if (profile.height_cm !== undefined && profile.height_cm !== null && typeof profile.height_cm !== "number") return false
    if (profile.goal !== undefined && profile.goal !== null && typeof profile.goal !== "string") return false
    if (profile.fitness_level !== undefined && profile.fitness_level !== null && typeof profile.fitness_level !== "string") return false
  }

  return value.weekly_series.every((day) => {
    return (
      typeof day.day_key === "string" &&
      typeof day.label === "string" && day.label.length > 0 &&
      typeof day.focus === "string" && day.focus.length > 0 &&
      typeof day.duration === "string" && day.duration.length > 0 &&
      typeof day.is_rest === "boolean" &&
      Array.isArray(day.exercises) && day.exercises.length > 0
    )
  })
}
