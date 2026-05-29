"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import type { DayKey } from "@/lib/workout-data"
import {
  EXERCISE_CATEGORY_LABELS,
  EXERCISE_CATEGORY_META,
  getExercisesByCategory,
  searchExercises,
  type ExerciseCategory,
  type ExerciseCatalogItem,
} from "@/lib/workout-data"
import {
  IcoChevron,
  IcoEdit,
  IcoInfo,
  IcoLoader,
  IcoMoon,
  IcoPlus,
  IcoSave,
  IcoTrash,
  IcoYoutube,
} from "@/components/AppIcons"
import { trackTelemetryEvent } from "@/lib/telemetry"

// ─────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────

interface Category {
  id: string
  name: string
  icon_key: string
}

interface ProgramExercise {
  id: string
  program_day_id: string
  category_id: string | null
  name: string
  sets: number
  reps: string | null
  duration_label: string | null
  is_timed: boolean
  equipment: string | null
  youtube_url: string | null
  youtube_search: string | null
  tip: string | null
  order_index: number
  // local only
  _dirty?: boolean
  _new?: boolean
  _deleted?: boolean
}

interface ProgramDay {
  id: string
  day_key: DayKey
  label: string
  short_label: string
  icon_key: string
  focus: string | null
  equipment: string | null
  duration: string | null
  is_rest: boolean
  order_index: number
  exercises: ProgramExercise[]
  _dirty?: boolean
}

const DAY_ORDER: DayKey[] = [
  "monday", "tuesday", "wednesday", "thursday",
  "friday", "saturday", "sunday",
]

const DAY_ABBR: Record<DayKey, string> = {
  monday: "Mon", tuesday: "Tue", wednesday: "Wed",
  thursday: "Thu", friday: "Fri", saturday: "Sat", sunday: "Sun",
}

const ICON_OPTIONS = [
  { key: "push",     label: "Push" },
  { key: "pull",     label: "Pull" },
  { key: "legs",     label: "Legs" },
  { key: "fire",     label: "Full Body" },
  { key: "recovery", label: "Recovery" },
  { key: "hiit",     label: "HIIT" },
  { key: "rest",     label: "Rest" },
]

// ─────────────────────────────────────────────
//  Shared input style
// ─────────────────────────────────────────────

const INPUT: React.CSSProperties = {
  background: "var(--bg-input)",
  border: "0.5px solid var(--border-default)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text-primary)",
  fontSize: 13,
  fontFamily: "inherit",
  padding: "8px 10px",
  outline: "none",
  width: "100%",
}

const LABEL: React.CSSProperties = {
  fontSize: 11,
  color: "var(--text-secondary)",
  fontWeight: 500,
  marginBottom: 4,
  display: "block",
}

// ─────────────────────────────────────────────
//  Exercise form — inline add/edit
// ─────────────────────────────────────────────

function ExerciseForm({
  exercise,
  categories,
  onChange,
  onDelete,
  isNew,
}: {
  exercise: ProgramExercise
  categories: Category[]
  onChange: (updated: ProgramExercise) => void
  onDelete: () => void
  isNew?: boolean
}) {
  const [open, setOpen] = useState(!!isNew)
  const [activeCatalogCategory, setActiveCatalogCategory] = useState<ExerciseCategory>("upper_body")
  const [catalogSearch, setCatalogSearch] = useState("")
  const [debouncedCatalogSearch, setDebouncedCatalogSearch] = useState("")

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedCatalogSearch(catalogSearch.trim()), 180)
    return () => window.clearTimeout(timeout)
  }, [catalogSearch])

  useEffect(() => {
    trackTelemetryEvent("catalog_category_viewed", {
      source: "program_editor",
      category: activeCatalogCategory,
    })
  }, [activeCatalogCategory])

  function u<K extends keyof ProgramExercise>(key: K, val: ProgramExercise[K]) {
    onChange({ ...exercise, [key]: val, _dirty: true })
  }

  const catalogResults = useMemo(
    () =>
      debouncedCatalogSearch
        ? searchExercises(debouncedCatalogSearch, activeCatalogCategory)
        : getExercisesByCategory(activeCatalogCategory),
    [activeCatalogCategory, debouncedCatalogSearch]
  )

  useEffect(() => {
    if (!debouncedCatalogSearch) return
    trackTelemetryEvent("catalog_search_used", {
      source: "program_editor",
      category: activeCatalogCategory,
      query: debouncedCatalogSearch,
      result_count: catalogResults.length,
    })
  }, [activeCatalogCategory, catalogResults.length, debouncedCatalogSearch])

  function resolveProgramCategoryId(item: ExerciseCatalogItem): string | null {
    const expectedName = EXERCISE_CATEGORY_LABELS[item.category].toLowerCase()
    const matched = categories.find((category) => {
      const name = category.name.toLowerCase()
      if (name === expectedName) return true
      return name.includes(expectedName) || expectedName.includes(name)
    })
    return matched?.id ?? null
  }

  function applyCatalogExercise(item: ExerciseCatalogItem) {
    const firstNumber = item.defaultRepsOrDuration.match(/\d+/)?.[0]
    const nextReps = item.isTimed ? null : item.defaultRepsOrDuration
    const nextDuration = item.isTimed ? item.defaultRepsOrDuration : null

    onChange({
      ...exercise,
      name: item.name,
      sets: item.defaultSets,
      reps: nextReps,
      duration_label: nextDuration,
      is_timed: item.isTimed,
      equipment: item.equipment,
      youtube_url: exercise.youtube_url,
      youtube_search: item.youtubeSearch,
      category_id: resolveProgramCategoryId(item),
      tip: exercise.tip,
      _dirty: true,
    })

    trackTelemetryEvent("catalog_exercise_selected", {
      source: "program_editor",
      category: item.category,
      exercise_id: item.id,
      exercise_name: item.name,
      via: debouncedCatalogSearch ? "search" : "category",
      default_target: firstNumber ? Number(firstNumber) : undefined,
    })
  }

  // Auto-generate youtube search from name if no URL provided
  const autoSearch = exercise.name.trim()
    ? exercise.name.trim().replace(/\s+/g, "+") + "+tutorial+form+how+to"
    : ""

  const youtubeHref = exercise.youtube_url?.trim()
    || (autoSearch ? `https://www.youtube.com/results?search_query=${autoSearch}` : null)

  return (
    <div style={{
      background: "var(--bg-elevated)",
      border: `0.5px solid ${isNew ? "var(--accent-border)" : "var(--border-subtle)"}`,
      borderRadius: "var(--radius-md)",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "10px 12px", cursor: "pointer",
      }} onClick={() => setOpen(v => !v)}>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>
          {exercise.name || <span style={{ color: "var(--text-muted)" }}>Unnamed exercise</span>}
        </span>
        <span style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>
          {exercise.sets}× {exercise.is_timed ? (exercise.duration_label || "timed") : (exercise.reps || "reps")}
        </span>
        {youtubeHref && (
          <a href={youtubeHref} target="_blank" rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{ display: "flex", alignItems: "center", gap: 3, color: "#ff4444", fontSize: 11, textDecoration: "none", flexShrink: 0 }}>
            <IcoYoutube />
          </a>
        )}
        <button onClick={(e) => { e.stopPropagation(); onDelete() }}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 2, display: "flex", opacity: 0.6, flexShrink: 0 }}>
          <IcoTrash />
        </button>
        <IcoChevron open={open} />
      </div>

      {/* Body */}
      {open && (
        <div style={{ borderTop: "0.5px solid var(--border-subtle)", padding: "12px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

            {/* Name */}
            <div>
              <label style={LABEL}>Catalog</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
                {EXERCISE_CATEGORY_META.map((category) => {
                  const active = activeCatalogCategory === category.id
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setActiveCatalogCategory(category.id)}
                      style={{
                        background: active ? "var(--accent-dim)" : "var(--bg-surface)",
                        border: `0.5px solid ${active ? "var(--accent-border)" : "var(--border-default)"}`,
                        borderRadius: 20,
                        color: active ? "var(--accent)" : "var(--text-secondary)",
                        fontSize: 11,
                        padding: "4px 8px",
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      {category.shortLabel}
                    </button>
                  )
                })}
              </div>
              <input
                style={INPUT}
                placeholder="Search catalog"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
              />
              <div
                style={{
                  marginTop: 6,
                  maxHeight: 120,
                  overflowY: "auto",
                  border: "0.5px solid var(--border-subtle)",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--bg-surface)",
                  padding: 6,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                {catalogResults.slice(0, 8).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => applyCatalogExercise(item)}
                    style={{
                      textAlign: "left",
                      border: "0.5px solid var(--border-default)",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--bg-elevated)",
                      color: "var(--text-primary)",
                      fontSize: 11,
                      padding: "6px 8px",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <span>{item.name}</span>
                    <span style={{ color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                      {EXERCISE_CATEGORY_LABELS[item.category]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={LABEL}>Exercise name *</label>
              <input style={INPUT} placeholder="e.g. Smith Incline Press"
                value={exercise.name}
                onChange={e => u("name", e.target.value)} />
            </div>

            {/* Category + Sets */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 80px", gap: 8 }}>
              <div>
                <label style={LABEL}>Category</label>
                <select style={{ ...INPUT, cursor: "pointer" }}
                  value={exercise.category_id ?? ""}
                  onChange={e => u("category_id", e.target.value || null)}>
                  <option value="">— None —</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={LABEL}>Sets</label>
                <input type="number" style={INPUT} min={1} max={10}
                  value={exercise.sets}
                  onChange={e => u("sets", Math.max(1, Number(e.target.value)))} />
              </div>
            </div>

            {/* Track by toggle */}
            <div>
              <label style={LABEL}>Track by</label>
              <div style={{ display: "flex", background: "var(--bg-input)", border: "0.5px solid var(--border-default)", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
                {[
                  { val: false, label: "Weight × Reps" },
                  { val: true,  label: "Duration" },
                ].map(opt => (
                  <button key={String(opt.val)} type="button"
                    onClick={() => u("is_timed", opt.val)}
                    style={{
                      flex: 1, border: "none", cursor: "pointer", fontFamily: "inherit",
                      fontSize: 12, padding: "7px 0",
                      background: exercise.is_timed === opt.val ? "var(--accent)" : "transparent",
                      color: exercise.is_timed === opt.val ? "#fff" : "var(--text-muted)",
                      fontWeight: exercise.is_timed === opt.val ? 500 : 400,
                      transition: "background 0.15s",
                    }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Reps or Duration */}
            {exercise.is_timed ? (
              <div>
                <label style={LABEL}>Duration target (e.g. &quot;3-5 min&quot; or &quot;30-60 sec&quot;)</label>
                <input style={INPUT} placeholder="e.g. 30–60 sec"
                  value={exercise.duration_label ?? ""}
                  onChange={e => u("duration_label", e.target.value)} />
              </div>
            ) : (
              <div>
                <label style={LABEL}>Reps target (e.g. &quot;8-12&quot; or &quot;12 each leg&quot;)</label>
                <input style={INPUT} placeholder="e.g. 8–12"
                  value={exercise.reps ?? ""}
                  onChange={e => u("reps", e.target.value)} />
              </div>
            )}

            {/* Equipment */}
            <div>
              <label style={LABEL}>Equipment</label>
              <input style={INPUT} placeholder="e.g. Dumbbells, Smith Machine, Bodyweight"
                value={exercise.equipment ?? ""}
                onChange={e => u("equipment", e.target.value)} />
            </div>

            {/* YouTube URL */}
            <div>
              <label style={LABEL}>YouTube URL (optional — leave blank to auto-search)</label>
              <input style={INPUT} placeholder="https://youtube.com/watch?v=..."
                value={exercise.youtube_url ?? ""}
                onChange={e => u("youtube_url", e.target.value)} />
              {!exercise.youtube_url?.trim() && exercise.name.trim() && (
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                  Will auto-search: &quot;{exercise.name.trim()} tutorial form how to&quot;
                </p>
              )}
            </div>

            {/* Form tip */}
            <div>
              <label style={LABEL}>Form tip (shown in workout card)</label>
              <textarea style={{ ...INPUT, resize: "none" }} rows={2}
                placeholder="e.g. Keep elbows at 45°, control the descent..."
                value={exercise.tip ?? ""}
                onChange={e => u("tip", e.target.value)} />
            </div>

          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
//  Day card
// ─────────────────────────────────────────────

function DayCard({
  day,
  categories,
  onChange,
  onAddExercise,
}: {
  day: ProgramDay
  categories: Category[]
  onChange: (updated: ProgramDay) => void
  onAddExercise: () => void
}) {
  const [open, setOpen] = useState(false)
  const [editingDay, setEditingDay] = useState(false)

  function updateDay<K extends keyof ProgramDay>(key: K, val: ProgramDay[K]) {
    onChange({ ...day, [key]: val, _dirty: true })
  }

  function updateExercise(id: string, updated: ProgramExercise) {
    onChange({
      ...day,
      exercises: day.exercises.map(e => e.id === id ? updated : e),
    })
  }

  function deleteExercise(id: string) {
    onChange({
      ...day,
      exercises: day.exercises.map(e =>
        e.id === id ? { ...e, _deleted: true } : e
      ),
    })
  }

  const visibleExercises = day.exercises.filter(e => !e._deleted)

  return (
    <div style={{
      background: "var(--bg-surface)",
      border: `0.5px solid ${day._dirty ? "var(--accent-border)" : "var(--border-subtle)"}`,
      borderRadius: "var(--radius-lg)",
      overflow: "hidden",
      transition: "border-color 0.2s",
    }}>
      {/* Day header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}>
        {/* Day abbreviation badge */}
        <div style={{
          width: 38, height: 38, borderRadius: "var(--radius-sm)",
          background: day.is_rest ? "var(--bg-elevated)" : "var(--accent-dim)",
          border: `0.5px solid ${day.is_rest ? "var(--border-default)" : "var(--accent-border)"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <span style={{
            fontSize: 11, fontWeight: 600,
            color: day.is_rest ? "var(--text-muted)" : "var(--accent)",
          }}>
            {DAY_ABBR[day.day_key]}
          </span>
        </div>

        {/* Label */}
        <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => setOpen(v => !v)}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {day.label}
            </p>
            {day.is_rest && (
              <span style={{ display: "flex", color: "var(--text-muted)", flexShrink: 0 }}><IcoMoon /></span>
            )}
            {day._dirty && (
              <span style={{ fontSize: 9, color: "var(--accent)", background: "var(--accent-dim)", borderRadius: 20, padding: "1px 6px", flexShrink: 0 }}>
                Unsaved
              </span>
            )}
          </div>
          {!day.is_rest && (
            <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 1 }}>
              {visibleExercises.length} exercise{visibleExercises.length !== 1 ? "s" : ""}
              {day.duration ? ` · ${day.duration}` : ""}
            </p>
          )}
        </div>

        {/* Edit day button */}
        <button onClick={() => setEditingDay(v => !v)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 6, display: "flex", opacity: 0.7 }}>
          <IcoEdit />
        </button>

        {/* Expand/collapse */}
        <button onClick={() => setOpen(v => !v)}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 6, display: "flex" }}>
          <IcoChevron open={open} />
        </button>
      </div>

      {/* Day edit form */}
      {editingDay && (
        <div style={{ borderTop: "0.5px solid var(--border-subtle)", padding: "12px 16px", background: "var(--bg-elevated)", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={LABEL}>Day label</label>
              <input style={INPUT} placeholder="e.g. My Leg Day"
                value={day.label}
                onChange={e => updateDay("label", e.target.value)} />
            </div>
            <div>
              <label style={LABEL}>Short label</label>
              <input style={INPUT} placeholder="e.g. Legs"
                value={day.short_label}
                onChange={e => updateDay("short_label", e.target.value)} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={LABEL}>Focus muscles</label>
              <input style={INPUT} placeholder="e.g. Quads / Glutes"
                value={day.focus ?? ""}
                onChange={e => updateDay("focus", e.target.value)} />
            </div>
            <div>
              <label style={LABEL}>Duration</label>
              <input style={INPUT} placeholder="e.g. 45–55 min"
                value={day.duration ?? ""}
                onChange={e => updateDay("duration", e.target.value)} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={LABEL}>Equipment</label>
              <input style={INPUT} placeholder="e.g. Smith + Dumbbells"
                value={day.equipment ?? ""}
                onChange={e => updateDay("equipment", e.target.value)} />
            </div>
            <div>
              <label style={LABEL}>Icon</label>
              <select style={{ ...INPUT, cursor: "pointer" }}
                value={day.icon_key}
                onChange={e => updateDay("icon_key", e.target.value)}>
                {ICON_OPTIONS.map(o => (
                  <option key={o.key} value={o.key}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
          {/* Rest day toggle */}
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input type="checkbox" checked={day.is_rest}
              onChange={e => updateDay("is_rest", e.target.checked)}
              style={{ accentColor: "var(--accent)", width: 15, height: 15 }} />
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              Mark as rest day (no exercises)
            </span>
          </label>
          <button onClick={() => setEditingDay(false)}
            style={{ ...INPUT, textAlign: "center", cursor: "pointer", color: "var(--text-secondary)", fontSize: 12, width: "auto", padding: "6px 14px", alignSelf: "flex-start" }}>
            Done editing day
          </button>
        </div>
      )}

      {/* Exercise list */}
      {open && !day.is_rest && (
        <div style={{ borderTop: "0.5px solid var(--border-subtle)", padding: "12px 14px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {visibleExercises.map(ex => (
              <ExerciseForm
                key={ex.id}
                exercise={ex}
                categories={categories}
                isNew={ex._new}
                onChange={updated => updateExercise(ex.id, updated)}
                onDelete={() => deleteExercise(ex.id)}
              />
            ))}
          </div>

          {/* Add exercise button */}
          <button onClick={onAddExercise}
            style={{
              marginTop: visibleExercises.length > 0 ? 10 : 0,
              width: "100%", background: "none",
              border: "0.5px dashed var(--border-default)",
              borderRadius: "var(--radius-md)",
              color: "var(--text-secondary)", fontSize: 12,
              padding: "10px 0", cursor: "pointer",
              display: "flex", alignItems: "center",
              justifyContent: "center", gap: 5,
              fontFamily: "inherit",
            }}>
            <IcoPlus /> Add exercise
          </button>

          {day.is_rest && (
            <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "8px 0" }}>
              Rest day — no exercises
            </p>
          )}
        </div>
      )}

      {open && day.is_rest && (
        <div style={{ borderTop: "0.5px solid var(--border-subtle)", padding: "16px", textAlign: "center" }}>
          <span style={{ color: "var(--text-muted)" }}><IcoMoon /></span>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 6 }}>
            Rest day. No exercises to show.
          </p>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
//  Toast
// ─────────────────────────────────────────────

function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <div style={{
      position: "fixed", bottom: "calc(var(--nav-height) + 16px)",
      left: "50%", transform: "translateX(-50%)",
      background: type === "success" ? "rgba(76,175,125,0.95)" : "rgba(220,60,60,0.95)",
      color: "#fff", fontSize: 13, fontWeight: 500,
      borderRadius: 30, padding: "10px 20px",
      whiteSpace: "nowrap", zIndex: 100,
      boxShadow: "0 4px 20px rgba(0,0,0,0.4)", pointerEvents: "none",
    }}>
      {msg}
    </div>
  )
}

// ─────────────────────────────────────────────
//  Page
// ─────────────────────────────────────────────

export default function ProgramPage() {
  const supabase = createClient()

  const [days, setDays]           = useState<ProgramDay[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [isAdmin, setIsAdmin]     = useState(false)
  const [toast, setToast]         = useState<{ msg: string; type: "success" | "error" } | null>(null)

  // ── Fetch data ──────────────────────────────

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Profile + admin check
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()
    setIsAdmin(profile?.role === "admin")

    // Categories
    const { data: cats } = await supabase
      .from("exercise_categories")
      .select("*")
      .order("sort_order")
    setCategories(cats ?? [])

    // Program days + exercises
    const { data: programDays } = await supabase
      .from("program_days")
      .select(`
        *,
        exercises:program_exercises (*)
      `)
      .eq("user_id", user.id)
      .order("order_index")

    if (programDays) {
      const sorted = DAY_ORDER.map(key =>
        programDays.find(d => d.day_key === key)
      ).filter(Boolean) as (typeof programDays[0])[]

      setDays(sorted.map(d => ({
        ...d,
        exercises: (d.exercises ?? []).sort(
          (a: ProgramExercise, b: ProgramExercise) => a.order_index - b.order_index
        ),
      })))
    }

    setLoading(false)
  }, [supabase])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchData() }, [fetchData])

  // ── Add exercise to a day ───────────────────

  function addExercise(dayId: string) {
    setDays(prev => prev.map(d => {
      if (d.id !== dayId) return d
      const newEx: ProgramExercise = {
        id:             `new-${crypto.randomUUID()}`,
        program_day_id: dayId,
        category_id:    null,
        name:           "",
        sets:           3,
        reps:           "8–12",
        duration_label: null,
        is_timed:       false,
        equipment:      null,
        youtube_url:    null,
        youtube_search: null,
        tip:            null,
        order_index:    d.exercises.filter(e => !e._deleted).length,
        _new:           true,
        _dirty:         true,
      }
      return { ...d, exercises: [...d.exercises, newEx], _dirty: true }
    }))
  }

  function updateDay(updated: ProgramDay) {
    setDays(prev => prev.map(d => d.id === updated.id ? updated : d))
  }

  // ── Save all dirty data to Supabase ─────────

  async function saveAll() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const dirtyDays = days.filter(d => d._dirty)
    let hasError = false

    for (const day of dirtyDays) {
      // Update day metadata
      const { error: dayErr } = await supabase
        .from("program_days")
        .update({
          label:       day.label,
          short_label: day.short_label,
          icon_key:    day.icon_key,
          focus:       day.focus,
          equipment:   day.equipment,
          duration:    day.duration,
          is_rest:     day.is_rest,
        })
        .eq("id", day.id)

      if (dayErr) { hasError = true; continue }

      // Process exercises
      for (const ex of day.exercises) {
        if (ex._deleted && !ex._new) {
          // Delete from DB
          await supabase.from("program_exercises").delete().eq("id", ex.id)
        } else if (ex._new && !ex._deleted) {
          // Insert new
          const { error: insErr } = await supabase
            .from("program_exercises")
            .insert({
              program_day_id: day.id,
              user_id:        user.id,
              category_id:    ex.category_id,
              name:           ex.name,
              sets:           ex.sets,
              reps:           ex.is_timed ? null : ex.reps,
              duration_label: ex.is_timed ? ex.duration_label : null,
              is_timed:       ex.is_timed,
              equipment:      ex.equipment,
              youtube_url:    ex.youtube_url,
              youtube_search: ex.youtube_search,
              tip:            ex.tip,
              order_index:    ex.order_index,
            })
          if (insErr) hasError = true
        } else if (ex._dirty && !ex._new && !ex._deleted) {
          // Update existing
          const { error: updErr } = await supabase
            .from("program_exercises")
            .update({
              category_id:    ex.category_id,
              name:           ex.name,
              sets:           ex.sets,
              reps:           ex.is_timed ? null : ex.reps,
              duration_label: ex.is_timed ? ex.duration_label : null,
              is_timed:       ex.is_timed,
              equipment:      ex.equipment,
              youtube_url:    ex.youtube_url,
              youtube_search: ex.youtube_search,
              tip:            ex.tip,
              order_index:    ex.order_index,
            })
            .eq("id", ex.id)
          if (updErr) hasError = true
        }
      }
    }

    setSaving(false)

    if (hasError) {
      showToast("Some changes couldn't be saved. Please try again.", "error")
    } else {
      showToast("Program saved!", "success")
      // Refresh to clear dirty flags
      await fetchData()
    }
  }

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2800)
  }

  const hasDirtyChanges = days.some(d => d._dirty)

  // ── Skeleton ────────────────────────────────

  if (loading) {
    return (
      <div style={{ paddingTop: 24 }}>
        <div style={{ height: 28, width: 140, background: "var(--bg-surface)", borderRadius: 6, marginBottom: 24 }} />
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} style={{
            height: 66, background: "var(--bg-surface)",
            border: "0.5px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)", marginBottom: 8,
            animation: "pulse 1.5s ease-in-out infinite",
            animationDelay: `${i * 0.08}s`,
          }} />
        ))}
        <style>{`@keyframes pulse{0%,100%{opacity:.4}50%{opacity:.9}}`}</style>
      </div>
    )
  }

  return (
    <div style={{ paddingTop: 24, paddingBottom: 8 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500, color: "var(--text-primary)", marginBottom: 4 }}>
            My Program
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            Customize your weekly workout schedule
          </p>
        </div>

        {/* Save button */}
        <button
          onClick={saveAll}
          disabled={saving || !hasDirtyChanges}
          style={{
            background: hasDirtyChanges && !saving ? "var(--accent)" : "var(--bg-elevated)",
            border: `0.5px solid ${hasDirtyChanges && !saving ? "var(--accent)" : "var(--border-default)"}`,
            borderRadius: "var(--radius-md)",
            color: hasDirtyChanges && !saving ? "#fff" : "var(--text-muted)",
            fontSize: 13, fontWeight: 500, padding: "9px 16px",
            cursor: hasDirtyChanges && !saving ? "pointer" : "default",
            fontFamily: "inherit", flexShrink: 0,
            minHeight: 40,
            display: "flex", alignItems: "center", gap: 6,
            transition: "background 0.15s",
          }}>
          {saving ? <><IcoLoader /> Saving…</> : <><IcoSave /> Save changes</>}
        </button>
      </div>

      {/* Admin notice */}
      {isAdmin && (
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 8,
          background: "rgba(232,87,42,0.08)",
          border: "0.5px solid var(--accent-border)",
          borderRadius: "var(--radius-md)", padding: "10px 14px",
          marginBottom: 16,
        }}>
          <span style={{ color: "var(--accent)", flexShrink: 0, marginTop: 1 }}><IcoInfo /></span>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>
            You are signed in as <strong style={{ color: "var(--accent)" }}>admin</strong>. You are editing your personal program. New users receive a copy of the default GainLog template when they sign up.
          </p>
        </div>
      )}

      {/* Info banner */}
      <div style={{
        display: "flex", alignItems: "flex-start", gap: 8,
        background: "var(--bg-surface)",
        border: "0.5px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)", padding: "10px 14px",
        marginBottom: 20,
      }}>
        <span style={{ color: "var(--text-muted)", flexShrink: 0, marginTop: 1 }}><IcoInfo /></span>
        <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>
          Tap a day to expand it. Click the edit icon to rename a day or change its type. Add exercises with the &quot;+&quot; button. Changes are local until you tap <strong>Save changes</strong>.
        </p>
      </div>

      {/* Day cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {days.map(day => (
          <DayCard
            key={day.id}
            day={day}
            categories={categories}
            onChange={updateDay}
            onAddExercise={() => addExercise(day.id)}
          />
        ))}
      </div>

      {/* Floating save bar — appears when there are unsaved changes */}
      {hasDirtyChanges && (
        <div style={{
          position: "fixed", bottom: "calc(var(--nav-height) + 12px)",
          left: "50%", transform: "translateX(-50%)",
          background: "var(--bg-elevated)",
          border: "0.5px solid var(--accent-border)",
          borderRadius: 30, padding: "10px 14px",
          width: "calc(100% - 32px)",
          maxWidth: 460,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
          boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
          zIndex: 40,
        }}>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
            Unsaved changes
          </p>
          <button onClick={saveAll} disabled={saving}
            style={{
              background: "var(--accent)", border: "none",
              borderRadius: 20, color: "#fff",
              fontSize: 13, fontWeight: 500,
              padding: "6px 16px", cursor: "pointer",
              fontFamily: "inherit",
              display: "flex", alignItems: "center", gap: 6,
            }}>
            {saving ? <><IcoLoader /> Saving…</> : <><IcoSave /> Save now</>}
          </button>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </div>
  )
}