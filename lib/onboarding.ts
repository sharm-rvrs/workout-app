type MissingColumnError = {
  code?: string
  message?: string
  details?: string
}

const LEGACY_SCHEMA_ERROR_CODES = new Set(["PGRST204", "42703"])

function isMissingColumnError(error: MissingColumnError | null | undefined): boolean {
  if (!error) return false
  if (typeof error.code === "string" && LEGACY_SCHEMA_ERROR_CODES.has(error.code)) {
    return true
  }

  const text = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase()
  return (
    text.includes("column") &&
    (text.includes("does not exist") || text.includes("not found") || text.includes("could not find"))
  )
}

function removeField<T extends Record<string, unknown>>(payload: T, field: string): T {
  if (!(field in payload)) return payload
  const next = { ...payload }
  delete next[field as keyof T]
  return next
}

export type OnboardingConfirmationSource = "use_plan" | "program_confirm"

export type OnboardingTransition = {
  nextPath: string
  shouldMarkComplete: boolean
}

export function getOnboardingTransition(action: "customize" | "use_plan"): OnboardingTransition {
  if (action === "customize") {
    return {
      nextPath: "/program",
      shouldMarkComplete: false,
    }
  }

  return {
    nextPath: "/",
    shouldMarkComplete: true,
  }
}

type ProfilesUpdateClient = {
  from: (table: "profiles") => {
    update: (values: Record<string, unknown>) => {
      eq: (column: "id", value: string) => PromiseLike<{ error: MissingColumnError | null }>
    }
  }
}

export async function markOnboardingCompleted(
  supabase: ProfilesUpdateClient,
  userId: string,
  source: OnboardingConfirmationSource
): Promise<{ confirmedAt: string; persistedFields: string[] }> {
  const confirmedAt = new Date().toISOString()

  let payload: Record<string, unknown> = {
    program_confirmed_at: confirmedAt,
    onboarding_completed_at: confirmedAt,
    onboarding_completion_source: source,
    onboarding_complete: true,
  }

  const fallbackFields = [
    "onboarding_completion_source",
    "onboarding_completed_at",
    "onboarding_complete",
    "program_confirmed_at",
  ]

  let fallbackIndex = 0

  while (Object.keys(payload).length > 0) {
    const { error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", userId)

    if (!error) {
      return {
        confirmedAt,
        persistedFields: Object.keys(payload),
      }
    }

    if (!isMissingColumnError(error)) {
      throw error
    }

    const missingColumn =
      error.message?.match(/column\s+"([^"]+)"/i)?.[1] ??
      error.message?.match(/'([^']+)'\s+column/i)?.[1]
    if (missingColumn) {
      payload = removeField(payload, missingColumn)
      continue
    }

    if (fallbackIndex >= fallbackFields.length) {
      throw error
    }

    payload = removeField(payload, fallbackFields[fallbackIndex])
    fallbackIndex += 1
  }

  // Legacy schemas may miss all onboarding confirmation columns.
  // Do not block onboarding flow in that case.
  return {
    confirmedAt,
    persistedFields: [],
  }
}
