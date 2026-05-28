// @vitest-environment jsdom

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { trackTelemetryEvent } from "@/lib/telemetry"

describe("trackTelemetryEvent", () => {
  const analyticsKey = process.env.NEXT_PUBLIC_ANALYTICS_WRITE_KEY

  beforeEach(() => {
    process.env.NEXT_PUBLIC_ANALYTICS_WRITE_KEY = "test-key"
  })

  afterEach(() => {
    process.env.NEXT_PUBLIC_ANALYTICS_WRITE_KEY = analyticsKey
    vi.restoreAllMocks()
  })

  it("dispatches workout-telemetry events when analytics is enabled", () => {
    const listener = vi.fn()
    window.addEventListener("workout-telemetry", listener)

    trackTelemetryEvent("log_saved", { date: "2026-05-26" })

    expect(listener).toHaveBeenCalledTimes(1)
    const event = listener.mock.calls[0][0] as CustomEvent
    expect(event.detail.name).toBe("log_saved")
    expect(event.detail.payload.date).toBe("2026-05-26")
  })

  it("is a no-op when analytics env vars are absent", () => {
    process.env.NEXT_PUBLIC_ANALYTICS_WRITE_KEY = ""

    const listener = vi.fn()
    window.addEventListener("workout-telemetry", listener)

    trackTelemetryEvent("log_started", { source: "recent_picker" })

    expect(listener).not.toHaveBeenCalled()
  })
})
