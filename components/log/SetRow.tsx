"use client"

import { useState } from "react"
import type { CSSProperties } from "react"
import type { SetEntry } from "@/lib/workout-data"
import { IcoTrash } from "@/components/AppIcons"

export function SetRow({
  set,
  index,
  isTimed,
  onChange,
  onDelete,
  canDelete,
}: {
  set: SetEntry
  index: number
  isTimed: boolean
  onChange: (s: SetEntry) => void
  onDelete: () => void
  canDelete: boolean
}) {
  const [unit, setUnit] = useState<"sec" | "min">("sec")

  const inputStyle: CSSProperties = {
    flex: 1,
    background: "var(--bg-input)",
    border: "0.5px solid var(--border-default)",
    borderRadius: "var(--radius-sm)",
    color: "var(--text-primary)",
    fontSize: 15,
    fontFamily: "inherit",
    padding: "9px 10px",
    textAlign: "center",
    minWidth: 0,
    outline: "none",
  }

  // Convert stored seconds 
  const displayValue =
    set.durationSeconds === undefined
      ? ""
      : unit === "min"
      ? +(set.durationSeconds / 60).toFixed(2) 
      : set.durationSeconds

  function handleDurationChange(raw: string) {
    if (!raw) {
      onChange({ ...set, durationSeconds: undefined })
      return
    }
    const num = parseFloat(raw)
    const seconds = unit === "min" ? Math.round(num * 60) : Math.round(num)
    onChange({ ...set, durationSeconds: seconds })
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0" }}>
      <span style={{ fontSize: 11, color: "var(--text-muted)", width: 38, flexShrink: 0 }}>
        Set {index + 1}
      </span>

      {isTimed ? (
        <>
          <input
            type="number"
            inputMode="decimal"
            placeholder={unit === "min" ? "min" : "sec"}
            value={displayValue}
            onChange={(e) => handleDurationChange(e.target.value)}
            style={inputStyle}
          />

          <div
            style={{
              display: "flex",
              background: "var(--bg-elevated)",
              border: "0.5px solid var(--border-default)",
              borderRadius: "var(--radius-sm)",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            {(["sec", "min"] as const).map((u) => (
              <button
                key={u}
                onClick={() => setUnit(u)}
                style={{
                  background: unit === u ? "var(--accent)" : "transparent",
                  border: "none",
                  color: unit === u ? "#fff" : "var(--text-muted)",
                  fontSize: 11,
                  fontWeight: unit === u ? 500 : 400,
                  padding: "6px 9px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "background 0.15s, color 0.15s",
                }}
              >
                {u}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <input
            type="number"
            inputMode="decimal"
            placeholder="kg"
            value={set.weightKg ?? ""}
            onChange={(e) =>
              onChange({ ...set, weightKg: e.target.value ? Number(e.target.value) : undefined })
            }
            style={inputStyle}
          />
          <span style={{ fontSize: 13, color: "var(--text-muted)", flexShrink: 0 }}>×</span>
          <input
            type="number"
            inputMode="numeric"
            placeholder="reps"
            value={set.reps ?? ""}
            onChange={(e) => onChange({ ...set, reps: e.target.value ? Number(e.target.value) : undefined })}
            style={inputStyle}
          />
        </>
      )}

      {canDelete && (
        <button
          onClick={onDelete}
          aria-label="Delete set"
          style={{
            background: "none",
            border: "none",
            color: "var(--text-muted)",
            cursor: "pointer",
            padding: 4,
            flexShrink: 0,
            opacity: 0.6,
            display: "flex",
          }}
        >
          <IcoTrash />
        </button>
      )}
    </div>
  )
}
