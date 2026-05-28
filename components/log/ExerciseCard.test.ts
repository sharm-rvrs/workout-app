// @vitest-environment jsdom

import React from "react"
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest"
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { ExerciseCard } from "@/components/log/ExerciseCard"
import type { ExerciseLog } from "@/lib/workout-data"

function click(element: Element) {
  act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }))
  })
}

describe("ExerciseCard rest timer interaction", () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
  })

  function renderCard(onUpdate = vi.fn()) {
    const log: ExerciseLog = {
      exerciseId: "ex-1",
      exerciseName: "Incline Press",
      isTimed: false,
      sets: [{ setNumber: 1 }],
      notes: "",
    }

    act(() => {
      root.render(
        React.createElement(ExerciseCard, {
          exercise: null,
          log,
          defaultOpen: true,
          onUpdate,
          onRemove: vi.fn(),
        })
      )
    })

    return { onUpdate }
  }

  it("opens timer panel from compact trigger", () => {
    renderCard()
    expect(container.querySelector('[data-testid="rest-timer-panel"]')).toBeNull()

    const toggle = container.querySelector('button[aria-label="Show rest timer"]')
    expect(toggle).not.toBeNull()
    click(toggle as Element)

    expect(container.querySelector('[data-testid="rest-timer-panel"]')).not.toBeNull()
  })

  it("keeps add-set interaction available while timer panel is open", () => {
    const { onUpdate } = renderCard()

    const toggle = container.querySelector('button[aria-label="Show rest timer"]')
    click(toggle as Element)

    const addSetButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Add set")
    )
    expect(addSetButton).not.toBeUndefined()

    click(addSetButton as Element)
    expect(onUpdate).toHaveBeenCalled()

    const updated = onUpdate.mock.calls[0][0] as ExerciseLog
    expect(updated.sets.length).toBe(2)
  })
})
