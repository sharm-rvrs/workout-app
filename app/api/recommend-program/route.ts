import Groq from "groq-sdk"
import { createClient } from "@/lib/supabase/server"
import {
  buildDeterministicWeeklySeries,
  buildFallbackRecommendation,
  isValidRecommendationShape,
  type RecommendationProgramDay,
  type RecommendationResponse,
  type WeeklySeriesDay,
} from "@/lib/recommendation"

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

const GOAL_LABELS: Record<string, string> = {
  recomp:        "Body Recomposition (build muscle + lose fat simultaneously)",
  lose_fat:      "Lose Fat (reduce body fat while preserving muscle)",
  build_muscle:  "Build Muscle (maximize muscle growth and strength)",
  maintain:      "Maintain current fitness",
  endurance:     "Improve Endurance (cardiovascular fitness and stamina)",
}

const LEVEL_LABELS: Record<string, string> = {
  beginner:     "Beginner (less than 1 year of consistent training)",
  intermediate: "Intermediate (1–3 years of regular training)",
  advanced:     "Advanced (3+ years, solid form and knowledge)",
}

type ProgramExerciseRow = {
  name: string
  sets: number
  reps: string | null
  duration_label: string | null
  is_timed: boolean
  equipment: string | null
}

type ProgramDayRow = RecommendationProgramDay & {
  id: string
  icon_key: string | null
  program_exercises: ProgramExerciseRow[] | null
}

type RecommendationContext = {
  userId: string
  profile: {
    full_name: string | null
    age: number | null
    weight_kg: number | null
    height_cm: number | null
    goal: string | null
    fitness_level: string | null
  }
  programDays: ProgramDayRow[]
  weeklySeries: WeeklySeriesDay[]
}

async function fetchAuthenticatedUser(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

async function fetchProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<RecommendationContext["profile"] | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, age, weight_kg, height_cm, goal, fitness_level")
    .eq("id", userId)
    .single()

  return (profile ?? null) as RecommendationContext["profile"] | null
}

async function fetchProgramDays(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<ProgramDayRow[]> {
  const { data } = await supabase
    .from("program_days")
    .select(`
      id, day_key, label, focus, duration, is_rest, icon_key,
      program_exercises (
        name, sets, reps, duration_label, is_timed, equipment
      )
    `)
    .eq("user_id", userId)
    .order("order_index")

  return (data ?? []) as ProgramDayRow[]
}

function buildWeeklySeries(profile: RecommendationContext["profile"], userId: string, programDays: ProgramDayRow[]) {
  return buildDeterministicWeeklySeries(
    {
      user_id: userId,
      ...profile,
    },
    programDays
  )
}

async function buildRecommendationContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<RecommendationContext | null> {
  const profile = await fetchProfile(supabase, userId)
  if (!profile) return null

  const programDays = await fetchProgramDays(supabase, userId)
  const weeklySeries = buildWeeklySeries(profile, userId, programDays)

  return {
    userId,
    profile,
    programDays,
    weeklySeries,
  }
}

function toShortLabel(label: string): string {
  const normalized = label.trim().replace(/\s+/g, " ")
  if (!normalized) return "Workout"

  const words = normalized.split(" ")
  const firstTwo = words.slice(0, 2).join(" ")
  if (firstTwo.length <= 18) return firstTwo
  if (words[0].length <= 18) return words[0]
  return `${words[0].slice(0, 15)}...`
}

function deriveIconKey(focus: string, label: string, isRest: boolean): "push" | "legs" | "recovery" | "pull" | "fire" | "hiit" | "rest" {
  if (isRest) return "rest"

  const text = `${focus} ${label}`.toLowerCase()

  if (text.includes("recovery")) return "recovery"
  if (text.includes("pull")) return "pull"
  if (text.includes("push")) return "push"
  if (/(lower|legs?|glutes?|quads?|hamstrings?)/.test(text)) return "legs"
  if (/(conditioning|cardio|hiit|interval|aerobic|tempo)/.test(text)) {
    return text.includes("hiit") || text.includes("interval") ? "hiit" : "fire"
  }

  return "fire"
}

export async function GET() {
  try {
    const supabase = await createClient()
    const user = await fetchAuthenticatedUser(supabase)

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const context = await buildRecommendationContext(supabase, user.id)
    if (!context) {
      return Response.json({ error: "Profile not found" }, { status: 404 })
    }

    const { profile, weeklySeries } = context

    let source: RecommendationResponse["source"] = "fallback"
    let recommendation = buildFallbackRecommendation(profile, weeklySeries)

    try {
      const prompt = `You are a professional fitness coach writing onboarding guidance.

USER PROFILE:
- Name: ${profile.full_name ?? "New user"}
- Age: ${profile.age ?? "Not provided"}
- Weight: ${profile.weight_kg ? `${profile.weight_kg} kg` : "Not provided"}
- Height: ${profile.height_cm ? `${profile.height_cm} cm` : "Not provided"}
- Goal: ${GOAL_LABELS[profile.goal ?? ""] ?? profile.goal ?? "Not specified"}
- Fitness Level: ${LEVEL_LABELS[profile.fitness_level ?? ""] ?? profile.fitness_level ?? "Not specified"}

WEEKLY SERIES:
${weeklySeries
  .map((day) => {
    const exercises = day.exercises.join(", ")
    return `- ${day.day_key}: ${day.label} (${day.duration}) -> ${exercises}`
  })
  .join("\n")}

Write a concise onboarding recommendation under 180 words:
1) Confirm this split fits their goal and level.
2) Provide 2-3 concrete tips for execution this week.
3) End with one motivating sentence.

Use plain text and numbered tips.`

      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        max_tokens: 320,
        temperature: 0,
        messages: [{ role: "user", content: prompt }],
      })

      const aiText = completion.choices[0]?.message?.content?.trim() ?? ""
      if (aiText) {
        source = "ai"
        recommendation = aiText
      }
    } catch {
      source = "fallback"
    }

    const responsePayload: RecommendationResponse & {
      profile: typeof profile
    } = {
      recommendation,
      weekly_series: weeklySeries,
      source,
      profile,
    }

    if (!isValidRecommendationShape(responsePayload)) {
      return Response.json({
        recommendation: buildFallbackRecommendation(profile, weeklySeries),
        weekly_series: weeklySeries,
        source: "fallback",
        profile,
      })
    }

    return Response.json(responsePayload)

  } catch (err) {
    console.error("Recommend program error:", err)
    return Response.json({ error: "Failed to generate recommendation" }, { status: 500 })
  }
}

export async function POST() {
  try {
    const supabase = await createClient()
    const user = await fetchAuthenticatedUser(supabase)

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const context = await buildRecommendationContext(supabase, user.id)
    if (!context) {
      return Response.json({ error: "Profile not found" }, { status: 404 })
    }

    const { programDays, weeklySeries } = context
    const weeklyByDay = new Map(weeklySeries.map((day) => [day.day_key, day]))

    let updatedDays = 0
    const errors: Array<{ id: string; day_key: string; error: string }> = []

    for (const dayRow of programDays) {
      const weeklyDay = weeklyByDay.get(dayRow.day_key)
      if (!weeklyDay) {
        errors.push({ id: dayRow.id, day_key: dayRow.day_key, error: "No matching weekly day" })
        continue
      }

      const patch = {
        label: weeklyDay.label,
        short_label: toShortLabel(weeklyDay.label),
        focus: weeklyDay.focus,
        duration: weeklyDay.duration,
        is_rest: weeklyDay.is_rest,
        icon_key: deriveIconKey(weeklyDay.focus, weeklyDay.label, weeklyDay.is_rest),
      }

      const { error } = await supabase
        .from("program_days")
        .update(patch)
        .eq("id", dayRow.id)
        .eq("user_id", user.id)

      if (error) {
        errors.push({ id: dayRow.id, day_key: dayRow.day_key, error: error.message })
        continue
      }

      updatedDays += 1
    }

    if (programDays.length > 0 && updatedDays === 0) {
      return Response.json(
        {
          error: "Failed to apply recommendation",
          applied: false,
          updated_days: 0,
          weekly_series: weeklySeries,
          errors,
        },
        { status: 500 }
      )
    }

    return Response.json({
      applied: true,
      updated_days: updatedDays,
      weekly_series: weeklySeries,
      errors,
    })
  } catch (err) {
    console.error("Apply recommended program error:", err)
    return Response.json({ error: "Failed to apply recommendation" }, { status: 500 })
  }
}