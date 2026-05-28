import { describe, expect, it } from "vitest"
import { isLegacySchemaSaveError } from "@/hooks/useWorkoutLog"

describe("isLegacySchemaSaveError", () => {
  it("returns true for known legacy schema codes", () => {
    expect(isLegacySchemaSaveError({ code: "PGRST204" })).toBe(true)
    expect(isLegacySchemaSaveError({ code: "42703" })).toBe(true)
  })

  it("returns true for missing-column style messages", () => {
    expect(
      isLegacySchemaSaveError({
        message: 'column "day_override" does not exist',
      })
    ).toBe(true)
  })

  it("returns false for unrelated errors", () => {
    expect(isLegacySchemaSaveError({ code: "23505", message: "duplicate key" })).toBe(false)
    expect(isLegacySchemaSaveError(null)).toBe(false)
  })
})
