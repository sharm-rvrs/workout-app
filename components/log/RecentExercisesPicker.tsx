"use client"

import { useMemo, useState } from "react"
import type { KeyboardEvent } from "react"
import type { RecentExerciseTemplate } from "@/lib/log-insights"

type Props = {
  recentExercises: RecentExerciseTemplate[]
  onSelect: (exercise: RecentExerciseTemplate) => void
  title?: string
}

export function RecentExercisesPicker({ recentExercises, onSelect, title = "Recent exercises" }: Props) {
  const [activeIndex, setActiveIndex] = useState(0)

  const visibleRecents = useMemo(() => recentExercises.slice(0, 8), [recentExercises])

  if (visibleRecents.length === 0) {
    return null
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      setActiveIndex((prev) => (prev + 1) % visibleRecents.length)
      return
    }

    if (event.key === "ArrowUp") {
      event.preventDefault()
      setActiveIndex((prev) => (prev - 1 + visibleRecents.length) % visibleRecents.length)
      return
    }

    if (event.key === "Enter") {
      event.preventDefault()
      onSelect(visibleRecents[activeIndex])
    }
  }

  return (
    <div
      role="listbox"
      tabIndex={0}
      aria-label={title}
      onKeyDown={onKeyDown}
      style={{
        background: "var(--bg-elevated)",
        border: "0.5px solid var(--border-subtle)",
        borderRadius: "var(--radius-sm)",
        padding: "8px",
      }}
    >
      <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>{title}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {visibleRecents.map((recent, index) => {
          const isActive = index === activeIndex
          return (
            <button
              key={recent.key}
              role="option"
              aria-selected={isActive}
              onFocus={() => setActiveIndex(index)}
              onClick={() => onSelect(recent)}
              style={{
                background: isActive ? "var(--accent-dim)" : "var(--bg-surface)",
                border: `0.5px solid ${isActive ? "var(--accent-border)" : "var(--border-default)"}`,
                borderRadius: 20,
                color: isActive ? "var(--accent)" : "var(--text-secondary)",
                fontSize: 11,
                padding: "5px 10px",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {recent.exerciseName}
            </button>
          )
        })}
      </div>
    </div>
  )
}
