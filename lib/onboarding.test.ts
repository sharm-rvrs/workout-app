import { describe, expect, it } from "vitest"
import { getOnboardingTransition, markOnboardingCompleted } from "@/lib/onboarding"

describe("getOnboardingTransition", () => {
  it("routes customize action to program without completion", () => {
    const transition = getOnboardingTransition("customize")
    expect(transition.nextPath).toBe("/program")
    expect(transition.shouldMarkComplete).toBe(false)
  })

  it("routes use_plan action to home and marks completion", () => {
    const transition = getOnboardingTransition("use_plan")
    expect(transition.nextPath).toBe("/")
    expect(transition.shouldMarkComplete).toBe(true)
  })
})

describe("markOnboardingCompleted", () => {
  it("falls back when optional profile columns are missing", async () => {
    const calls: Record<string, unknown>[] = []
    const responses = [
      { error: { code: "42703", message: 'column "onboarding_completion_source" does not exist' } },
      { error: null },
    ]

    const supabase = {
      from: () => ({
        update: (values: Record<string, unknown>) => ({
          eq: async () => {
            calls.push(values)
            return responses.shift() ?? { error: null }
          },
        }),
      }),
    }

    const result = await markOnboardingCompleted(supabase, "user-1", "use_plan")

    expect(calls).toHaveLength(2)
    expect(calls[0].onboarding_completion_source).toBe("use_plan")
    expect(calls[1].onboarding_completion_source).toBeUndefined()
    expect(result.persistedFields).toContain("program_confirmed_at")
  })
})
