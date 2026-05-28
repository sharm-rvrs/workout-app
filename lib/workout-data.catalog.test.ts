import { describe, expect, it } from "vitest"
import {
  getExercisesByCategory,
  getQuickAddExercises,
  searchExercises,
  toExerciseLogFromCatalog,
} from "@/lib/workout-data"

describe("workout catalog helpers", () => {
  it("filters exercises by category", () => {
    const upperBody = getExercisesByCategory("upper_body")
    expect(upperBody.length).toBeGreaterThan(0)
    expect(upperBody.every((item) => item.category === "upper_body")).toBe(true)
  })

  it("matches aliases in search", () => {
    const results = searchExercises("rdl")
    expect(results.some((item) => item.name === "Romanian Deadlift")).toBe(true)
  })

  it("returns category-scoped quick-add defaults when no prior logs are present", () => {
    const quickAdd = getQuickAddExercises(5, "cardio")
    expect(quickAdd.length).toBeGreaterThan(0)
    expect(quickAdd.every((item) => item.category === "cardio")).toBe(true)
  })

  it("maps catalog items to non-custom log entries", () => {
    const [benchPress] = searchExercises("bench press")
    const logExercise = toExerciseLogFromCatalog(benchPress)

    expect(logExercise.isCustom).toBe(false)
    expect(logExercise.exerciseName).toBe("Bench Press")
    expect(logExercise.sets.length).toBeGreaterThan(0)
  })

  it("returns no catalog results for unknown terms so custom fallback can be used", () => {
    expect(searchExercises("zzzz-unknown-exercise-name")).toEqual([])
  })
})
