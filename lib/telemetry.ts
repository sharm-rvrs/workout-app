export type TelemetryEventName =
  | "log_started"
  | "log_saved"
  | "pr_viewed"
  | "catalog_category_viewed"
  | "catalog_search_used"
  | "catalog_quick_add_used"
  | "catalog_exercise_selected"
  | "onboarding_customize_clicked"
  | "onboarding_use_plan_clicked"
  | "onboarding_completed"
  | "recommendation_generated"
  | "recommendation_fallback_used"
  | "recommendation_accepted"
  | "recommendation_rejected"

export type TelemetryPayload = Record<string, string | number | boolean | null | undefined>

declare global {
  interface Window {
    gtag?: (command: string, action: string, params?: Record<string, unknown>) => void
    plausible?: (eventName: string, options?: { props?: Record<string, unknown> }) => void
  }
}

function isTelemetryEnabled(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_ANALYTICS_WRITE_KEY ||
      process.env.NEXT_PUBLIC_POSTHOG_KEY ||
      process.env.NEXT_PUBLIC_VERCEL_ANALYTICS_ID
  )
}

export function trackTelemetryEvent(name: TelemetryEventName, payload: TelemetryPayload = {}): void {
  if (typeof window === "undefined" || !isTelemetryEnabled()) return

  const eventPayload = {
    ...payload,
    event_name: name,
    recorded_at: new Date().toISOString(),
  }

  window.dispatchEvent(
    new CustomEvent("workout-telemetry", {
      detail: {
        name,
        payload: eventPayload,
      },
    })
  )

  if (typeof window.gtag === "function") {
    window.gtag("event", name, eventPayload)
  }

  if (typeof window.plausible === "function") {
    window.plausible(name, { props: eventPayload })
  }
}
