"use client"

import { useEffect, useMemo, useRef, useState } from "react"

type RestTimerProps = {
  durationSeconds: number
  onDurationChange: (seconds: number) => void
  autoStartToken: number
}

function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${mins}:${String(secs).padStart(2, "0")}`
}

function playAlertBeep() {
  if (typeof window === "undefined") return

  try {
    const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return

    const ctx = new AudioCtx()
    const startAt = ctx.currentTime

    for (let i = 0; i < 2; i++) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = "sine"
      osc.frequency.value = i === 0 ? 880 : 660
      gain.gain.value = 0.0001

      osc.connect(gain)
      gain.connect(ctx.destination)

      const at = startAt + i * 0.22
      gain.gain.setValueAtTime(0.0001, at)
      gain.gain.exponentialRampToValueAtTime(0.18, at + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.18)
      osc.start(at)
      osc.stop(at + 0.2)
    }

    setTimeout(() => {
      void ctx.close()
    }, 900)
  } catch {
    // Ignore audio errors (unsupported browser or permission constraints).
  }
}

export function RestTimer({ durationSeconds, onDurationChange, autoStartToken }: RestTimerProps) {
  const [remaining, setRemaining] = useState(durationSeconds)
  const [running, setRunning] = useState(false)
  const prevAutoStartRef = useRef(autoStartToken)

  function applyDuration(nextSeconds: number) {
    onDurationChange(nextSeconds)
    setRemaining(nextSeconds)
    setRunning(false)
  }

  useEffect(() => {
    if (!running) return

    const interval = window.setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval)
          setRunning(false)
          playAlertBeep()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => window.clearInterval(interval)
  }, [running])

  useEffect(() => {
    if (prevAutoStartRef.current === autoStartToken) return
    prevAutoStartRef.current = autoStartToken

    setRemaining(durationSeconds)
    setRunning(true)
  }, [autoStartToken, durationSeconds])

  const radius = 28
  const stroke = 4
  const circumference = 2 * Math.PI * radius
  const progress = durationSeconds > 0 ? remaining / durationSeconds : 0
  const dashOffset = circumference * (1 - progress)

  const timerColor = useMemo(() => {
    if (remaining <= 5) return "#ff7b7b"
    if (running) return "var(--accent)"
    return "var(--text-muted)"
  }, [remaining, running])

  return (
    <div
      style={{
        marginTop: 12,
        background: "var(--bg-elevated)",
        border: "0.5px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        padding: "10px 12px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <p style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Rest Timer
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            onClick={() => applyDuration(Math.max(15, durationSeconds - 15))}
            style={{
              background: "none",
              border: "0.5px solid var(--border-default)",
              borderRadius: 6,
              color: "var(--text-secondary)",
              fontSize: 11,
              padding: "4px 8px",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            -15s
          </button>
          <input
            type="number"
            min={15}
            step={15}
            value={durationSeconds}
            onChange={(e) => applyDuration(Math.max(15, Number(e.target.value) || 15))}
            style={{
              width: 66,
              background: "var(--bg-input)",
              border: "0.5px solid var(--border-default)",
              borderRadius: 6,
              color: "var(--text-primary)",
              fontSize: 12,
              fontFamily: "inherit",
              padding: "4px 8px",
              textAlign: "center",
              outline: "none",
            }}
          />
          <button
            onClick={() => applyDuration(durationSeconds + 15)}
            style={{
              background: "none",
              border: "0.5px solid var(--border-default)",
              borderRadius: 6,
              color: "var(--text-secondary)",
              fontSize: 11,
              padding: "4px 8px",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            +15s
          </button>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ position: "relative", width: 68, height: 68, flexShrink: 0 }}>
          <svg width="68" height="68" viewBox="0 0 68 68" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="34" cy="34" r={radius} stroke="var(--border-default)" strokeWidth={stroke} fill="none" />
            <circle
              cx="34"
              cy="34"
              r={radius}
              stroke={timerColor}
              strokeWidth={stroke}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              style={{ transition: "stroke-dashoffset 1s linear, stroke 0.2s" }}
            />
          </svg>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            {formatTime(remaining)}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
            Auto-starts after each completed set. Audio alert plays when rest is finished.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setRunning((prev) => !prev)}
              style={{
                flex: 1,
                background: running ? "var(--bg-input)" : "var(--accent)",
                border: running ? "0.5px solid var(--border-default)" : "none",
                borderRadius: 8,
                color: running ? "var(--text-secondary)" : "#fff",
                fontSize: 12,
                fontWeight: 500,
                padding: "8px 0",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {running ? "Pause" : "Start"}
            </button>
            <button
              onClick={() => {
                setRemaining(durationSeconds)
                setRunning(false)
              }}
              style={{
                flex: 1,
                background: "none",
                border: "0.5px solid var(--border-default)",
                borderRadius: 8,
                color: "var(--text-secondary)",
                fontSize: 12,
                fontWeight: 500,
                padding: "8px 0",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
