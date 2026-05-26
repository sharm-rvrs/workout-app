import Groq from "groq-sdk"
import { createClient } from "@/lib/supabase/server"

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

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, age, weight_kg, height_cm, goal, fitness_level")
      .eq("id", user.id)
      .single()

    if (!profile) {
      return Response.json({ error: "Profile not found" }, { status: 404 })
    }

    // Fetch their copied program
    const { data: programDays } = await supabase
      .from("program_days")
      .select(`
        day_key, label, focus, duration, is_rest,
        program_exercises (
          name, sets, reps, duration_label, is_timed, equipment
        )
      `)
      .eq("user_id", user.id)
      .order("order_index")

    // Build program summary for the prompt
    const programSummary = programDays?.map((day) => {
      if (day.is_rest) return `${day.day_key}: Rest Day`
      const exercises = (day.program_exercises as {
        name: string; sets: number; reps?: string
        duration_label?: string; is_timed: boolean; equipment?: string
      }[])
        .map((ex) => `  • ${ex.name} — ${ex.sets} sets × ${ex.reps ?? ex.duration_label}`)
        .join("\n")
      return `${day.day_key} (${day.label} — ${day.duration}):\n${exercises}`
    }).join("\n\n") ?? "No program loaded"

    const prompt = `You are a professional fitness coach reviewing a new user's workout program.

USER PROFILE:
- Name: ${profile.full_name ?? "New user"}
- Age: ${profile.age ?? "Not provided"}
- Weight: ${profile.weight_kg ? `${profile.weight_kg} kg` : "Not provided"}
- Height: ${profile.height_cm ? `${profile.height_cm} cm` : "Not provided"}
- Goal: ${GOAL_LABELS[profile.goal ?? ""] ?? profile.goal ?? "Not specified"}
- Fitness Level: ${LEVEL_LABELS[profile.fitness_level ?? ""] ?? profile.fitness_level ?? "Not specified"}

THEIR CURRENT PROGRAM (GainLog default — Mon to Sun):
${programSummary}

Your task:
1. Briefly assess how well this program fits their goal and fitness level (2–3 sentences max)
2. Give 2–3 specific, actionable recommendations they should consider adjusting
3. End with an encouraging sentence about starting their journey

Keep the tone warm, practical, and direct — like a knowledgeable friend, not a textbook.
Format your response in plain text with short paragraphs. No markdown headers or bullet symbols — use numbered points for recommendations.
Keep the total response under 200 words.`

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 350,
      temperature: 0.7,
      messages: [{ role: "user", content: prompt }],
    })

    const recommendation = completion.choices[0]?.message?.content ?? ""

    return Response.json({ recommendation, profile })

  } catch (err) {
    console.error("Recommend program error:", err)
    return Response.json({ error: "Failed to generate recommendation" }, { status: 500 })
  }
}