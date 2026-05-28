import { describe, expect, it } from "vitest"
import {
  buildDeterministicWeeklySeries,
  buildFallbackRecommendation,
  isValidRecommendationShape,
} from "@/lib/recommendation"

describe("recommendation generation", () => {
  const profile = {
    user_id: "u1",
    full_name: "Casey User",
    goal: "build_muscle",
    fitness_level: "intermediate",
  }

  const programDays = [
    {
      day_key: "monday",
      label: "Upper Push",
      focus: "Chest and shoulders",
      duration: "50 min",
      is_rest: false,
      program_exercises: [
        { name: "Incline Press", sets: 4, reps: "8-12", duration_label: null, is_timed: false, equipment: "Dumbbells" },
      ],
    },
    {
      day_key: "wednesday",
      label: "Recovery",
      focus: "Mobility",
      duration: "25 min",
      is_rest: true,
      program_exercises: [],
    },
  ]

  it("builds deterministic weekly series for same inputs", () => {
    const first = buildDeterministicWeeklySeries(profile, programDays)
    const second = buildDeterministicWeeklySeries(profile, programDays)

    expect(first).toEqual(second)
    expect(first).toHaveLength(7)
    expect(first.filter((day) => !day.is_rest).length).toBeGreaterThanOrEqual(3)
  })

  it("builds non-empty fallback recommendation text", () => {
    const weeklySeries = buildDeterministicWeeklySeries(profile, programDays)
    const recommendation = buildFallbackRecommendation(profile, weeklySeries)
    expect(recommendation.length).toBeGreaterThan(30)
  })

  it("validates recommendation response shape", () => {
    const weeklySeries = buildDeterministicWeeklySeries(profile, programDays)
    expect(
      isValidRecommendationShape({
        recommendation: "Solid plan.",
        weekly_series: weeklySeries,
        source: "fallback",
      })
    ).toBe(true)

    expect(
      isValidRecommendationShape({
        recommendation: "",
        weekly_series: weeklySeries,
        source: "fallback",
      })
    ).toBe(false)
  })
})
