"use client"

import { useState } from "react"
import type { CSSProperties } from "react"
import type { ExerciseLog } from "@/lib/workout-data"

export function AddExerciseForm({
  onAdd,
  onCancel,
}: {
  onAdd: (ex: ExerciseLog) => void
  onCancel: () => void
}) {
  const [name, setName] = useState("")
  const [inputType, setInputType] = useState<"reps" | "timed">("reps")
  const [sets, setSets] = useState(3)

  function submit() {
    if (!name.trim()) return
    const newEx: ExerciseLog = {
      exerciseId: `custom-${crypto.randomUUID()}`,
      exerciseName: name.trim(),
      isCustom: true,
      isTimed: inputType === "timed", // stored on the log
      sets: Array.from({ length: sets }, (_, i) => ({
        setNumber: i + 1,
        weightKg: undefined,
        reps: undefined,
        durationSeconds: undefined,
      })),
      notes: "",
    }
    onAdd(newEx)
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
        Add custom exercise
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input
          placeholder="Exercise name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          autoFocus
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
              onChange={(e) => setSets(Math.max(1, Number(e.target.value)))}
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
