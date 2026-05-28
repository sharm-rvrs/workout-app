"use client"

import { useEffect, useMemo, useState } from "react"
import type { CSSProperties } from "react"
import {
  EXERCISE_CATEGORY_META,
  EXERCISE_CATEGORY_LABELS,
  getExercisesByCategory,
  getQuickAddExercises,
  searchExercises,
  toExerciseLogFromCatalog,
  type ExerciseCategory,
  type ExerciseLog,
} from "@/lib/workout-data"
import type { RecentExerciseTemplate } from "@/lib/log-insights"
import { RecentExercisesPicker } from "@/components/log/RecentExercisesPicker"
import { trackTelemetryEvent } from "@/lib/telemetry"

export function AddExerciseForm({
  onAdd,
  onCancel,
  recentExercises,
  initialRecent,
}: {
  onAdd: (ex: ExerciseLog) => void
  onCancel: () => void
  recentExercises: RecentExerciseTemplate[]
  initialRecent?: RecentExerciseTemplate | null
}) {
  const [activeCategory, setActiveCategory] = useState<ExerciseCategory>("upper_body")
  const [searchInput, setSearchInput] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [name, setName] = useState(initialRecent?.exerciseName ?? "")
  const [inputType, setInputType] = useState<"reps" | "timed">(initialRecent?.isTimed ? "timed" : "reps")
  const [sets, setSets] = useState(Math.max(1, initialRecent?.setTemplate.length ?? 3))
  const [youtubeUrl, setYoutubeUrl] = useState(initialRecent?.youtubeUrl ?? "")
  const [setTemplate, setSetTemplate] = useState<ExerciseLog["sets"] | null>(initialRecent?.setTemplate ?? null)

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 180)
    return () => window.clearTimeout(timeout)
  }, [searchInput])

  useEffect(() => {
    trackTelemetryEvent("catalog_category_viewed", {
      category: activeCategory,
      source: "log_add_exercise",
    })
  }, [activeCategory])

  const categoryExercises = useMemo(() => getExercisesByCategory(activeCategory), [activeCategory])
  const searchResults = useMemo(
    () => (debouncedSearch ? searchExercises(debouncedSearch, activeCategory) : []),
    [activeCategory, debouncedSearch]
  )
  const visibleCatalog = debouncedSearch ? searchResults : categoryExercises

  useEffect(() => {
    if (!debouncedSearch) return
    trackTelemetryEvent("catalog_search_used", {
      query: debouncedSearch,
      category: activeCategory,
      result_count: visibleCatalog.length,
      source: "log_add_exercise",
    })
  }, [activeCategory, debouncedSearch, visibleCatalog.length])

  const catalogQuickAddTemplates = useMemo(() => {
    return getQuickAddExercises(6, activeCategory).map((catalogItem) => {
      const log = toExerciseLogFromCatalog(catalogItem)
      return {
        key: `catalog-${catalogItem.id}`,
        exerciseName: catalogItem.name,
        isTimed: catalogItem.isTimed,
        youtubeUrl: undefined,
        setTemplate: log.sets,
      } satisfies RecentExerciseTemplate
    })
  }, [activeCategory])

  const quickAddTemplates = useMemo(() => {
    const merged = [...recentExercises, ...catalogQuickAddTemplates]
    const seen = new Set<string>()
    const deduped: RecentExerciseTemplate[] = []

    for (const template of merged) {
      const key = template.exerciseName.trim().toLowerCase()
      if (!key || seen.has(key)) continue
      seen.add(key)
      deduped.push(template)
      if (deduped.length >= 8) break
    }

    return deduped
  }, [catalogQuickAddTemplates, recentExercises])

  function handleRecentPick(recent: RecentExerciseTemplate) {
    setName(recent.exerciseName)
    setInputType(recent.isTimed ? "timed" : "reps")
    setSets(Math.max(1, recent.setTemplate.length))
    setYoutubeUrl(recent.youtubeUrl ?? "")
    setSetTemplate(recent.setTemplate)
  }

  function submit() {
    if (!name.trim()) return
    const defaultSets =
      setTemplate && setTemplate.length > 0
        ? setTemplate.map((set, index) => ({
            setNumber: index + 1,
            weightKg: set.weightKg,
            reps: set.reps,
            durationSeconds: set.durationSeconds,
          }))
        : Array.from({ length: sets }, (_, i) => ({
            setNumber: i + 1,
            weightKg: undefined,
            reps: undefined,
            durationSeconds: undefined,
          }))

    const newEx: ExerciseLog = {
      exerciseId: `custom-${crypto.randomUUID()}`,
      exerciseName: name.trim(),
      isCustom: true,
      isTimed: inputType === "timed", // stored on the log
      youtubeUrl: youtubeUrl.trim() || undefined,
      sets: defaultSets,
      notes: "",
    }
    onAdd(newEx)
  }

  function addCatalogItem(itemId: string) {
    const selected = visibleCatalog.find((item) => item.id === itemId)
    if (!selected) return

    trackTelemetryEvent("catalog_exercise_selected", {
      source: "log_add_exercise",
      category: selected.category,
      exercise_id: selected.id,
      exercise_name: selected.name,
      via: debouncedSearch ? "search" : "category",
    })
    onAdd(toExerciseLogFromCatalog(selected))
  }

  function handleQuickAddPick(recent: RecentExerciseTemplate) {
    if (recent.key.startsWith("catalog-")) {
      const itemId = recent.key.replace("catalog-", "")
      const selected = categoryExercises.find((item) => item.id === itemId) ?? searchExercises(recent.exerciseName)[0]
      if (!selected) return

      trackTelemetryEvent("catalog_quick_add_used", {
        source: "log_add_exercise",
        category: selected.category,
        exercise_id: selected.id,
      })
      trackTelemetryEvent("catalog_exercise_selected", {
        source: "log_add_exercise",
        category: selected.category,
        exercise_id: selected.id,
        exercise_name: selected.name,
        via: "quick_add_catalog",
      })

      onAdd(toExerciseLogFromCatalog(selected))
      return
    }

    trackTelemetryEvent("catalog_quick_add_used", {
      source: "log_add_exercise",
      category: "recent",
      exercise_name: recent.exerciseName,
    })

    onAdd({
      exerciseId: `custom-${crypto.randomUUID()}`,
      exerciseName: recent.exerciseName,
      isCustom: true,
      isTimed: recent.isTimed,
      youtubeUrl: recent.youtubeUrl,
      sets: recent.setTemplate.map((set, index) => ({
        setNumber: index + 1,
        weightKg: set.weightKg,
        reps: set.reps,
        durationSeconds: set.durationSeconds,
      })),
      notes: "",
    })
  }

  const inputStyle: CSSProperties = {
    background: "var(--bg-input)",
    border: "0.5px solid var(--border-default)",
    borderRadius: "var(--radius-sm)",
    color: "var(--text-primary)",
    fontSize: 14,
    fontFamily: "inherit",
    padding: "9px 12px",
    outline: "none",
    width: "100%",
  }

  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "0.5px solid var(--accent-border)",
        borderRadius: "var(--radius-lg)",
        padding: "16px",
      }}
    >
      <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", marginBottom: 12 }}>
        Add exercise
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <RecentExercisesPicker
          recentExercises={quickAddTemplates}
          onSelect={handleQuickAddPick}
          title="Quick add"
        />

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {EXERCISE_CATEGORY_META.map((category) => {
            const active = activeCategory === category.id
            return (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                onFocus={() => setActiveCategory(category.id)}
                style={{
                  background: active ? "var(--accent-dim)" : "var(--bg-elevated)",
                  border: `0.5px solid ${active ? "var(--accent-border)" : "var(--border-default)"}`,
                  borderRadius: 20,
                  color: active ? "var(--accent)" : "var(--text-secondary)",
                  fontSize: 11,
                  padding: "5px 10px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {category.label}
              </button>
            )
          })}
        </div>

        <input
          placeholder="Search catalog exercises"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          style={inputStyle}
        />

        {visibleCatalog.length > 0 ? (
          <div
            style={{
              maxHeight: 200,
              overflowY: "auto",
              border: "0.5px solid var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
              background: "var(--bg-elevated)",
              padding: 6,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {visibleCatalog.slice(0, 12).map((item) => (
                <button
                  key={item.id}
                  onClick={() => addCatalogItem(item.id)}
                  style={{
                    background: "var(--bg-surface)",
                    border: "0.5px solid var(--border-default)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--text-primary)",
                    fontSize: 12,
                    textAlign: "left",
                    padding: "8px 10px",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <span>{item.name}</span>
                  <span style={{ fontSize: 10, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                    {EXERCISE_CATEGORY_LABELS[item.category]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>
            No catalog matches. Add a custom exercise below.
          </p>
        )}

        <RecentExercisesPicker
          recentExercises={recentExercises}
          onSelect={handleRecentPick}
          title="Use recent"
        />

        <input
          placeholder="Exercise name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          autoFocus
          style={inputStyle}
        />

        <input
          placeholder="YouTube URL (optional)"
          value={youtubeUrl}
          onChange={(e) => setYoutubeUrl(e.target.value)}
          style={inputStyle}
        />

        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
              Sets
            </label>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={10}
              value={sets}
              onChange={(e) => {
                setSets(Math.max(1, Number(e.target.value)))
                setSetTemplate(null)
              }}
              style={inputStyle}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
              Track by
            </label>
            <select
              value={inputType}
              onChange={(e) => setInputType(e.target.value as "reps" | "timed")}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              <option value="reps">Weight × Reps</option>
              <option value="timed">Duration (sec/min)</option>
            </select>
          </div>
        </div>

        {/* Preview of what the input will look like */}
        <div
          style={{
            background: "var(--bg-elevated)",
            border: "0.5px solid var(--border-subtle)",
            borderRadius: "var(--radius-sm)",
            padding: "8px 12px",
            fontSize: 11,
            color: "var(--text-muted)",
          }}
        >
          {inputType === "timed"
            ? "Each set will have a duration input with sec / min toggle"
            : "Each set will have weight (kg) × reps inputs"}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              background: "none",
              border: "0.5px solid var(--border-default)",
              borderRadius: "var(--radius-sm)",
              color: "var(--text-secondary)",
              fontSize: 13,
              padding: "10px 0",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!name.trim()}
            style={{
              flex: 2,
              background: name.trim() ? "var(--accent)" : "var(--bg-elevated)",
              border: "none",
              borderRadius: "var(--radius-sm)",
              color: name.trim() ? "#fff" : "var(--text-muted)",
              fontSize: 13,
              fontWeight: 500,
              padding: "10px 0",
              cursor: name.trim() ? "pointer" : "default",
              fontFamily: "inherit",
            }}
          >
            Add exercise
          </button>
        </div>
      </div>
    </div>
  )
}
