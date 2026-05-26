"use client"

import { useState } from "react"
import type { Exercise, ExerciseLog, SetEntry } from "@/lib/workout-data"
import { buildYoutubeUrl } from "@/lib/workout-data"
import {
  IcoCheck,
  IcoChevron,
  IcoEdit,
  IcoInfo,
  IcoPlus,
  IcoX,
  IcoYoutube,
} from "@/components/AppIcons"
import { SetRow } from "./SetRow"
import { RestTimer } from "./RestTimer"

function normalizeYoutubeUrl(raw: string): string | null {
  const val = raw.trim()
  if (!val) return null
  if (val.startsWith("http://") || val.startsWith("https://")) return val
  if (val.startsWith("youtube.com") || val.startsWith("www.youtube.com") || val.startsWith("youtu.be")) {
    return `https://${val}`
  }
  return null
}

function toSearchQuery(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, "+")
}

export function ExerciseCard({
  exercise,
  log,
  defaultOpen,
  onUpdate,
  onRemove,
}: {
  exercise: Exercise | null
  log: ExerciseLog
  defaultOpen: boolean
  onUpdate: (updated: ExerciseLog) => void
  onRemove: () => void
}) {
  const [open, setOpen] = useState(defaultOpen)
  const [editingName, setEditingName] = useState(false)
  const [nameVal, setNameVal] = useState(log.exerciseName)
  const [restDuration, setRestDuration] = useState(90)
  const [restAutoStartToken, setRestAutoStartToken] = useState(0)
  const [editingYoutube, setEditingYoutube] = useState(false)
  const [youtubeVal, setYoutubeVal] = useState(log.youtubeUrl ?? "")

  const isTimed: boolean = log.isTimed !== undefined ? log.isTimed : !!(exercise?.duration && !exercise?.reps)

  const nameMatchesTemplate = exercise?.name === log.exerciseName
  const showTip = !!exercise?.tip && nameMatchesTemplate

  const hasData = log.sets.some((s) => s.weightKg || s.reps || s.durationSeconds)

  const manualYoutubeUrl = normalizeYoutubeUrl(log.youtubeUrl ?? youtubeVal)
  const nameSearch = toSearchQuery(log.exerciseName)
  const fallbackSearch = toSearchQuery(exercise?.youtubeSearch ?? "workout exercise form tutorial")
  const youtubeHref = manualYoutubeUrl
    ?? buildYoutubeUrl(nameSearch ? `${nameSearch}+tutorial+form+how+to` : fallbackSearch)

  function updateSet(i: number, updated: SetEntry) {
    const sets = [...log.sets]
    sets[i] = updated
    onUpdate({ ...log, sets })
  }

  function addSet() {
    onUpdate({ ...log, sets: [...log.sets, { setNumber: log.sets.length + 1 }] })
  }

  function deleteSet(i: number) {
    if (log.sets.length <= 1) return
    const sets = log.sets
      .filter((_, idx) => idx !== i)
      .map((s, idx) => ({ ...s, setNumber: idx + 1 }))
    onUpdate({ ...log, sets })
  }

  function saveName() {
    onUpdate({ ...log, exerciseName: nameVal.trim() || log.exerciseName })
    setEditingName(false)
  }

  function saveYoutubeUrl() {
    const cleaned = youtubeVal.trim()
    onUpdate({
      ...log,
      youtubeUrl: cleaned || undefined,
    })
    setEditingYoutube(false)
  }

  function handleSetCompleted() {
    setRestAutoStartToken((prev) => prev + 1)
  }

  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: `0.5px solid ${
          hasData ? "var(--accent-border)" : log.isCustom ? "var(--border-default)" : "var(--border-subtle)"
        }`,
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        transition: "border-color 0.2s",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", padding: "13px 14px", gap: 10 }}>
        <button
          onClick={() => setOpen((v) => !v)}
          style={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            flexShrink: 0,
            marginTop: 1,
            background: hasData ? "var(--accent-dim)" : "var(--bg-elevated)",
            border: `0.5px solid ${hasData ? "var(--accent-border)" : "var(--border-default)"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "var(--accent)",
          }}
        >
          {hasData && <IcoCheck />}
        </button>

        <div style={{ flex: 1, minWidth: 0 }} onClick={() => !editingName && setOpen((v) => !v)}>
          {editingName ? (
            <input
              autoFocus
              value={nameVal}
              onChange={(e) => setNameVal(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => e.key === "Enter" && saveName()}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "var(--bg-input)",
                border: "0.5px solid var(--accent)",
                borderRadius: "var(--radius-sm)",
                color: "var(--text-primary)",
                fontSize: 14,
                fontFamily: "inherit",
                padding: "4px 8px",
                fontWeight: 500,
                width: "100%",
                outline: "none",
              }}
            />
          ) : (
            <p
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: "var(--text-primary)",
                cursor: "pointer",
                marginBottom: 2,
              }}
            >
              {log.exerciseName}
              {log.isCustom && (
                <span
                  style={{
                    fontSize: 10,
                    color: "var(--accent)",
                    background: "var(--accent-dim)",
                    borderRadius: 20,
                    padding: "1px 7px",
                    marginLeft: 8,
                    fontWeight: 400,
                  }}
                >
                  Custom
                </span>
              )}
            </p>
          )}
          <p style={{ fontSize: 11, color: "var(--text-muted)", cursor: "pointer" }}>
            {exercise
              ? `${exercise.sets} sets · ${exercise.reps ?? exercise.duration}${
                  exercise.equipment ? ` · ${exercise.equipment}` : ""
                }`
              : `${log.sets.length} sets · ${isTimed ? "timed" : "weight × reps"}`}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {!!youtubeHref && (
            <a
              href={youtubeHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                background: "rgba(255,0,0,0.1)",
                border: "0.5px solid rgba(255,0,0,0.2)",
                borderRadius: 20,
                padding: "4px 9px",
                fontSize: 10,
                color: "#ff4444",
                textDecoration: "none",
                fontWeight: 500,
                whiteSpace: "nowrap",
              }}
            >
              <IcoYoutube /> Watch
            </a>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              setEditingYoutube((v) => !v)
            }}
            title="Edit YouTube URL"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              padding: 4,
              display: "flex",
              opacity: 0.7,
            }}
          >
            <IcoYoutube />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setEditingName(true)
            }}
            title="Rename"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              padding: 4,
              display: "flex",
              opacity: 0.7,
            }}
          >
            <IcoEdit />
          </button>
          <button
            onClick={onRemove}
            title="Remove from this session"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              padding: 4,
              display: "flex",
              opacity: 0.7,
            }}
          >
            <IcoX />
          </button>
          <button
            onClick={() => setOpen((v) => !v)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}
          >
            <IcoChevron open={open} />
          </button>
        </div>
      </div>

      {open && (
        <div style={{ borderTop: "0.5px solid var(--border-subtle)", padding: "12px 14px 14px" }}>
          {showTip && (
            <div
              style={{
                background: "var(--bg-elevated)",
                border: "0.5px solid var(--border-subtle)",
                borderRadius: "var(--radius-sm)",
                padding: "9px 12px",
                marginBottom: 12,
                display: "flex",
                gap: 8,
                alignItems: "flex-start",
              }}
            >
              <IcoInfo size={14} stroke="var(--accent)" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>{exercise!.tip}</p>
            </div>
          )}

          {editingYoutube && (
            <div
              style={{
                background: "var(--bg-elevated)",
                border: "0.5px solid var(--border-subtle)",
                borderRadius: "var(--radius-sm)",
                padding: "8px 10px",
                marginBottom: 10,
              }}
            >
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>
                YouTube URL (optional). If empty, a search link is generated from exercise name.
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={youtubeVal}
                  onChange={(e) => setYoutubeVal(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  style={{
                    flex: 1,
                    background: "var(--bg-input)",
                    border: "0.5px solid var(--border-default)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--text-primary)",
                    fontSize: 12,
                    fontFamily: "inherit",
                    padding: "7px 9px",
                    outline: "none",
                  }}
                />
                <button
                  onClick={saveYoutubeUrl}
                  style={{
                    background: "var(--accent)",
                    border: "none",
                    borderRadius: "var(--radius-sm)",
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 500,
                    padding: "0 10px",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          )}

          {/* Column headers for weight × reps */}
          {!isTimed && (
            <div style={{ display: "flex", gap: 8, paddingLeft: 46, marginBottom: 2 }}>
              {["Weight (kg)", "", "Reps"].map((h, i) => (
                <span
                  key={i}
                  style={{
                    flex: i === 1 ? "0 0 20px" : 1,
                    fontSize: 10,
                    color: "var(--text-muted)",
                    textAlign: "center",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  {h}
                </span>
              ))}
              <span style={{ width: 21, flexShrink: 0 }} />
            </div>
          )}

          <div style={{ borderTop: "0.5px solid var(--border-subtle)", paddingTop: 4 }}>
            {log.sets.map((set, i) => (
              <SetRow
                key={i}
                set={set}
                index={i}
                isTimed={isTimed}
                canDelete={log.sets.length > 1}
                onChange={(u) => updateSet(i, u)}
                onSetCompleted={handleSetCompleted}
                onDelete={() => deleteSet(i)}
              />
            ))}
          </div>

          <RestTimer
            durationSeconds={restDuration}
            onDurationChange={setRestDuration}
            autoStartToken={restAutoStartToken}
          />

          <button
            onClick={addSet}
            style={{
              marginTop: 8,
              width: "100%",
              background: "none",
              border: "0.5px dashed var(--border-default)",
              borderRadius: "var(--radius-sm)",
              color: "var(--text-muted)",
              fontSize: 12,
              cursor: "pointer",
              padding: "7px 0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              fontFamily: "inherit",
            }}
          >
            <IcoPlus /> Add set
          </button>

          <textarea
            placeholder="Notes for this exercise…"
            value={log.notes ?? ""}
            onChange={(e) => onUpdate({ ...log, notes: e.target.value })}
            rows={2}
            style={{
              marginTop: 8,
              width: "100%",
              background: "var(--bg-input)",
              border: "0.5px solid var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
              color: "var(--text-secondary)",
              fontSize: 12,
              fontFamily: "inherit",
              padding: "8px 10px",
              resize: "none",
              outline: "none",
            }}
          />
        </div>
      )}
    </div>
  )
}
