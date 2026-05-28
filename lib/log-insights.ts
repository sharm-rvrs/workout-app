import type { ExerciseLog, SetEntry, WorkoutLog } from "@/lib/workout-data"

export type RecentExerciseTemplate = {
  key: string
  exerciseName: string
  isTimed: boolean
  youtubeUrl?: string
  setTemplate: SetEntry[]
}

export type ExercisePerformanceSnapshot = {
  isTimed: boolean
  date: string
  weightKg?: number
  reps?: number
  durationSeconds?: number
}

export type ExercisePerformanceContext = {
  latest: ExercisePerformanceSnapshot | null
  previousBest: ExercisePerformanceSnapshot | null
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase()
}

function hasSetData(set: SetEntry): boolean {
  return (
    (typeof set.weightKg === "number" && set.weightKg > 0) ||
    (typeof set.reps === "number" && set.reps > 0) ||
    (typeof set.durationSeconds === "number" && set.durationSeconds > 0)
  )
}

function cloneSetTemplate(sets: SetEntry[]): SetEntry[] {
  return sets.map((set, index) => ({
    setNumber: index + 1,
    weightKg: set.weightKg,
    reps: set.reps,
    durationSeconds: set.durationSeconds,
  }))
}

function getMostComparableSet(exercise: ExerciseLog, isTimed: boolean): SetEntry | null {
  if (exercise.sets.length === 0) return null

  const filled = exercise.sets.filter(hasSetData)
  if (filled.length === 0) return null

  if (isTimed) {
    return filled
      .slice()
      .sort((a, b) => (b.durationSeconds ?? 0) - (a.durationSeconds ?? 0))[0]
  }

  return filled
    .slice()
    .sort((a, b) => {
      const byWeight = (b.weightKg ?? 0) - (a.weightKg ?? 0)
      if (byWeight !== 0) return byWeight
      return (b.reps ?? 0) - (a.reps ?? 0)
    })[0]
}

function isBetterSnapshot(next: ExercisePerformanceSnapshot, prev: ExercisePerformanceSnapshot | null): boolean {
  if (!prev) return true

  if (next.isTimed) {
    return (next.durationSeconds ?? 0) > (prev.durationSeconds ?? 0)
  }

  const weightDelta = (next.weightKg ?? 0) - (prev.weightKg ?? 0)
  if (weightDelta !== 0) return weightDelta > 0
  return (next.reps ?? 0) > (prev.reps ?? 0)
}

export function getRecentExerciseTemplates(logs: WorkoutLog[], max = 8): RecentExerciseTemplate[] {
  const recents = new Map<string, RecentExerciseTemplate>()
  const sorted = [...logs].sort((a, b) => {
    const left = a.completedAt || a.date
    const right = b.completedAt || b.date
    return right.localeCompare(left)
  })

  for (const log of sorted) {
    for (const exercise of log.exercises) {
      const key = normalizeName(exercise.exerciseName)
      if (!key || recents.has(key)) continue
      if (exercise.sets.length === 0) continue

      recents.set(key, {
        key,
        exerciseName: exercise.exerciseName,
        isTimed: !!exercise.isTimed,
        youtubeUrl: exercise.youtubeUrl,
        setTemplate: cloneSetTemplate(exercise.sets),
      })

      if (recents.size >= max) {
        return Array.from(recents.values())
      }
    }
  }

  return Array.from(recents.values())
}

export function getExercisePerformanceContext(
  logs: WorkoutLog[],
  exercise: Pick<ExerciseLog, "exerciseId" | "exerciseName" | "isTimed">,
  currentLogId?: string
): ExercisePerformanceContext {
  const key = normalizeName(exercise.exerciseName)
  const isTimed = !!exercise.isTimed
  const sorted = [...logs].sort((a, b) => {
    const left = a.completedAt || a.date
    const right = b.completedAt || b.date
    return right.localeCompare(left)
  })

  let latest: ExercisePerformanceSnapshot | null = null
  let previousBest: ExercisePerformanceSnapshot | null = null

  for (const log of sorted) {
    if (currentLogId && log.id === currentLogId) continue

    for (const candidate of log.exercises) {
      const sameId = candidate.exerciseId === exercise.exerciseId
      const sameName = normalizeName(candidate.exerciseName) === key
      if (!sameId && !sameName) continue

      const comparable = getMostComparableSet(candidate, isTimed)
      if (!comparable) continue

      const snapshot: ExercisePerformanceSnapshot = {
        isTimed,
        date: log.date,
        weightKg: comparable.weightKg,
        reps: comparable.reps,
        durationSeconds: comparable.durationSeconds,
      }

      if (!latest) {
        latest = snapshot
      }

      if (isBetterSnapshot(snapshot, previousBest)) {
        previousBest = snapshot
      }
    }
  }

  return { latest, previousBest }
}

export function formatPerformance(snapshot: ExercisePerformanceSnapshot | null): string {
  if (!snapshot) return "No history yet"
  if (snapshot.isTimed) {
    const seconds = snapshot.durationSeconds ?? 0
    return `${seconds}s`
  }

  const weight = snapshot.weightKg ?? 0
  const reps = snapshot.reps ?? 0
  return `${weight} kg x ${reps}`
}
