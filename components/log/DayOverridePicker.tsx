"use client"

import type { DayKey } from "@/lib/workout-data"
import { WORKOUT_PLAN } from "@/lib/workout-data"
import { DayBadge } from "@/components/WorkoutIcon"

const ALL_DAY_KEYS: DayKey[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]

export function DayOverridePicker({
  current,
  onSelect,
  onCancel,
}: {
  current: DayKey
  onSelect: (k: DayKey) => void
  onCancel: () => void
}) {
  return (
    <>
      <div
        onClick={onCancel}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          zIndex: 60,
          backdropFilter: "blur(4px)",
        }}
      />
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "var(--bg-surface)",
          borderRadius: "var(--radius-xl) var(--radius-xl) 0 0",
          border: "0.5px solid var(--border-default)",
          zIndex: 70,
          padding: "20px 20px 40px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <div style={{ width: 36, height: 4, background: "var(--border-strong)", borderRadius: 2 }} />
        </div>
        <p style={{ fontSize: 15, fontWeight: 500, color: "var(--text-primary)", marginBottom: 4 }}>
          Change workout type
        </p>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
          Only for this session. Your default schedule stays the same.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {ALL_DAY_KEYS.filter((k) => k !== "sunday").map((key) => {
            const day = WORKOUT_PLAN[key]
            const isActive = key === current
            return (
              <button
                key={key}
                onClick={() => onSelect(key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  background: isActive ? "var(--accent-dim)" : "var(--bg-elevated)",
                  border: `0.5px solid ${isActive ? "var(--accent-border)" : "var(--border-subtle)"}`,
                  borderRadius: "var(--radius-md)",
                  padding: "12px 14px",
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: "inherit",
                  width: "100%",
                }}
              >
                <DayBadge icon={day.icon} size={34} active={isActive} />
                <div>
                  <p
                    style={{
                      fontSize: 14,
                      fontWeight: isActive ? 500 : 400,
                      color: isActive ? "var(--accent)" : "var(--text-primary)",
                    }}
                  >
                    {day.label}
                  </p>
                  <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{day.focus}</p>
                </div>
                {isActive && (
                  <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--accent)" }}>Current</span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
