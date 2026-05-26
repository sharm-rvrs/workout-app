"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import type { CalendarDay, PersonalBest } from "@/lib/types"
import { getLogs, getLogsAsync, WORKOUT_PLAN, type WorkoutLog } from "@/lib/workout-data"
import { todayStrPH, formatDateFull, formatDateShort } from "@/lib/dates"
import WorkoutIcon, { DayBadge } from "@/components/WorkoutIcon"
import {
  IcoCalendarSimple,
  IcoChevLeft,
  IcoChevRight,
  IcoClose,
  IcoEdit,
  IcoPulse,
  IcoTrophy,
  IcoZap,
} from "@/components/AppIcons"

function computeStreak(logs: WorkoutLog[]): number {
  if (logs.length === 0) return 0
  const loggedDates = new Set(logs.map((l) => l.date))
  let count = 0
  const today = new Date(); today.setHours(0, 0, 0, 0)
  for (let i = 0; i < 365; i++) {
    const d = new Date(today); d.setDate(today.getDate() - i)
    if (d.getDay() === 0) continue
    const key = d.toISOString().split("T")[0]
    if (loggedDates.has(key)) { count++ } else if (i > 0) { break }
  }
  return count
}

function computePersonalBests(logs: WorkoutLog[]): PersonalBest[] {
  const map = new Map<string, PersonalBest>()
  for (const log of logs) {
    for (const ex of log.exercises) {
      for (const set of ex.sets) {
        if (!set.weightKg || set.weightKg <= 0) continue
        const existing = map.get(ex.exerciseId)
        if (!existing || set.weightKg > existing.weightKg) {
          map.set(ex.exerciseId, {
            exerciseId: ex.exerciseId, exerciseName: ex.exerciseName,
            weightKg: set.weightKg, reps: set.reps ?? 0,
            date: log.date, dayKey: log.dayOverride ?? log.dayKey,
          })
        }
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => b.weightKg - a.weightKg)
}

function buildCalendarDays(year: number, month: number, logMap: Map<string, WorkoutLog>): CalendarDay[] {
  const today = todayStrPH()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startOffset = (firstDay.getDay() + 6) % 7
  const days: CalendarDay[] = []

  for (let i = startOffset - 1; i >= 0; i--) {
    const d = new Date(year, month, -i)
    const dateStr = [d.getFullYear(), String(d.getMonth()+1).padStart(2,"0"), String(d.getDate()).padStart(2,"0")].join("-")
    days.push({ dateStr, dayOfMonth: d.getDate(), isCurrentMonth: false, isToday: dateStr === today, log: logMap.get(dateStr) ?? null })
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(year, month, d)
    const dateStr = [date.getFullYear(), String(date.getMonth()+1).padStart(2,"0"), String(d).padStart(2,"0")].join("-")
    days.push({ dateStr, dayOfMonth: d, isCurrentMonth: true, isToday: dateStr === today, log: logMap.get(dateStr) ?? null })
  }
  const remaining = 7 - (days.length % 7)
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i)
      const dateStr = [d.getFullYear(), String(d.getMonth()+1).padStart(2,"0"), String(d.getDate()).padStart(2,"0")].join("-")
      days.push({ dateStr, dayOfMonth: d.getDate(), isCurrentMonth: false, isToday: dateStr === today, log: logMap.get(dateStr) ?? null })
    }
  }
  return days
}

function SessionDrawer({ log, onClose }: { log: WorkoutLog; onClose: () => void }) {
  const workout = WORKOUT_PLAN[log.dayOverride ?? log.dayKey]
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 60, backdropFilter: "blur(4px)" }} />
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        maxHeight: "80dvh", background: "var(--bg-surface)",
        borderRadius: "var(--radius-xl) var(--radius-xl) 0 0",
        border: "0.5px solid var(--border-default)", zIndex: 70,
        display: "flex", flexDirection: "column", overflowY: "auto",
      }}>
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 12 }}>
          <div style={{ width: 36, height: 4, background: "var(--border-strong)", borderRadius: 2 }} />
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "16px 20px 12px", borderBottom: "0.5px solid var(--border-subtle)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <DayBadge icon={workout.icon} size={38} active />
            <div>
              <p style={{ fontSize: 15, fontWeight: 500, color: "var(--text-primary)" }}>{workout.label}</p>
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{formatDateFull(log.date)}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close"
            style={{ background: "var(--bg-elevated)", border: "0.5px solid var(--border-subtle)", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-secondary)", flexShrink: 0 }}>
            <IcoClose />
          </button>
        </div>

        <div style={{ padding: "12px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
          {log.exercises.map((ex) => {
            const filled = ex.sets.filter((s) => s.weightKg || s.reps || s.durationSeconds)
            if (filled.length === 0) return null
            return (
              <div key={ex.exerciseId}>
                <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", marginBottom: 8 }}>
                  {ex.exerciseName}
                  {ex.isCustom && <span style={{ fontSize: 10, color: "var(--accent)", background: "var(--accent-dim)", borderRadius: 20, padding: "1px 7px", marginLeft: 8 }}>Custom</span>}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {filled.map((set, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 12,
                      background: "var(--bg-elevated)", border: "0.5px solid var(--border-subtle)",
                      borderRadius: "var(--radius-sm)", padding: "8px 12px",
                    }}>
                      <span style={{ fontSize: 11, color: "var(--text-muted)", width: 40 }}>Set {set.setNumber}</span>
                      {set.durationSeconds ? (
                        <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{set.durationSeconds}s</span>
                      ) : (
                        <>
                          <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{set.weightKg ?? "—"} kg</span>
                          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>×</span>
                          <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{set.reps ?? "—"} reps</span>
                        </>
                      )}
                    </div>
                  ))}
                </div>
                {ex.notes && <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6, paddingLeft: 4 }}>Note: {ex.notes}</p>}
              </div>
            )
          })}
        </div>

        <div style={{ padding: "0 20px 32px" }}>
          <Link href={`/log?date=${log.date}`} onClick={onClose}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "var(--accent)", borderRadius: "var(--radius-md)", color: "#fff", fontSize: 14, fontWeight: 500, padding: "12px 0", textDecoration: "none" }}>
            <IcoEdit size={14} />
            Edit this session
          </Link>
        </div>
      </div>
    </>
  )
}

//Page
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"]
const WEEK_DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]

export default function ProgressPage() {
  const [logs, setLogs] = useState<WorkoutLog[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [selectedLog, setSelectedLog] = useState<WorkoutLog | null>(null)
  const [activeTab, setActiveTab] = useState<"calendar" | "history" | "pbs">("calendar")
  const now = new Date()
  const [calYear, setCalYear] = useState(now.getFullYear())
  const [calMonth, setCalMonth] = useState(now.getMonth())

  useEffect(() => {
    let cancelled = false

    async function loadLogs() {
      const loaded = await getLogsAsync()
      if (cancelled) return
      setLogs(loaded)
      setIsLoaded(true)
    }

    function onLogsUpdated() {
      if (cancelled) return
      setLogs(getLogs())
    }

    void loadLogs()
    window.addEventListener("workout-logs-updated", onLogsUpdated)

    return () => {
      cancelled = true
      window.removeEventListener("workout-logs-updated", onLogsUpdated)
    }
  }, [])

  if (!isLoaded) return null

  const logMap = new Map(logs.map((l) => [l.date, l]))
  const streak = computeStreak(logs)
  const pbs = computePersonalBests(logs)
  const calDays = buildCalendarDays(calYear, calMonth, logMap)
  const history = [...logs].sort((a, b) => b.date.localeCompare(a.date))

  function prevMonth() {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11) }
    else setCalMonth(m => m - 1)
  }
  function nextMonth() {
    if (calYear > now.getFullYear() || (calYear === now.getFullYear() && calMonth >= now.getMonth())) return
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0) }
    else setCalMonth(m => m + 1)
  }

  if (logs.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60dvh", gap: 12, textAlign: "center", padding: "0 24px" }}>
        <div style={{ color: "var(--text-muted)" }}><IcoPulse size={48} /></div>
        <h1 style={{ fontSize: 20, fontWeight: 500, color: "var(--text-primary)" }}>No workouts yet</h1>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>Log your first session and your progress will appear here.</p>
        <Link href="/log" style={{ marginTop: 8, background: "var(--accent)", borderRadius: "var(--radius-md)", color: "#fff", fontSize: 14, fontWeight: 500, padding: "11px 24px", textDecoration: "none" }}>
          Log first workout
        </Link>
      </div>
    )
  }

  return (
    <div style={{ paddingTop: 24, paddingBottom: 8 }}>
      <h1 style={{ fontSize: 22, fontWeight: 500, color: "var(--text-primary)", marginBottom: 16 }}>Progress</h1>

      {/* Stats */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        {[
          { icon: <IcoZap size={14} stroke="var(--accent)" />, label: "Streak", value: streak, sub: "days" },
          { icon: <IcoCalendarSimple size={14} stroke="var(--text-muted)" />, label: "Sessions", value: logs.length, sub: "total" },
          { icon: <IcoTrophy size={14} stroke="var(--text-muted)" />, label: "PRs", value: pbs.length, sub: "exercises" },
        ].map(({ icon, label, value, sub }) => (
          <div key={label} style={{ flex: 1, background: "var(--bg-surface)", border: "0.5px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: "12px 10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>{icon}<span style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span></div>
            <span style={{ fontSize: 24, fontWeight: 600, color: "var(--text-primary)", display: "block", lineHeight: 1 }}>{value}</span>
            <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{sub}</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", background: "var(--bg-surface)", border: "0.5px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: 4, marginBottom: 20, gap: 4 }}>
        {([["calendar", "Calendar"], ["history", "History"], ["pbs", "Personal Bests"]] as const).map(([tab, label]) => {
          const active = activeTab === tab
          return (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{ flex: 1, background: active ? "var(--bg-elevated)" : "transparent", border: active ? "0.5px solid var(--border-default)" : "none", borderRadius: "var(--radius-sm)", color: active ? "var(--text-primary)" : "var(--text-muted)", fontSize: 12, fontWeight: active ? 500 : 400, padding: "8px 4px", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
              {label}
            </button>
          )
        })}
      </div>

      {/* ── Calendar ── */}
      {activeTab === "calendar" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <button onClick={prevMonth} style={{ background: "var(--bg-surface)", border: "0.5px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", color: "var(--text-secondary)", width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><IcoChevLeft /></button>
            <span style={{ fontSize: 15, fontWeight: 500, color: "var(--text-primary)" }}>{MONTHS[calMonth]} {calYear}</span>
            <button onClick={nextMonth} style={{ background: "var(--bg-surface)", border: "0.5px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", color: "var(--text-secondary)", width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><IcoChevRight /></button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 6 }}>
            {WEEK_DAYS.map((d) => (
              <div key={d} style={{ textAlign: "center", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", paddingBottom: 4 }}>{d}</div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
            {calDays.map(({ dateStr, dayOfMonth, isCurrentMonth, isToday, log }) => {
              const hasLog = !!log
              const effectiveKey = log ? (log.dayOverride ?? log.dayKey) : null
              return (
                <button key={dateStr} onClick={() => log && setSelectedLog(log)} disabled={!hasLog}
                  style={{
                    aspectRatio: "1", background: isToday ? "var(--accent-dim)" : hasLog ? "var(--bg-surface)" : "transparent",
                    border: isToday ? "1px solid var(--accent-border)" : hasLog ? "0.5px solid var(--border-subtle)" : "none",
                    borderRadius: "var(--radius-sm)", cursor: hasLog ? "pointer" : "default",
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    gap: 2, padding: 2, opacity: isCurrentMonth ? 1 : 0.25, fontFamily: "inherit",
                  }}>
                  <span style={{ fontSize: 12, fontWeight: isToday ? 600 : 400, color: isToday ? "var(--accent)" : isCurrentMonth ? "var(--text-primary)" : "var(--text-muted)" }}>
                    {dayOfMonth}
                  </span>
                  {hasLog && effectiveKey && (
                    <WorkoutIcon icon={WORKOUT_PLAN[effectiveKey].icon} size={10}
                      color={isToday ? "var(--accent)" : "var(--text-muted)"} strokeWidth={2} />
                  )}
                </button>
              )
            })}
          </div>

          <div style={{ display: "flex", gap: 16, marginTop: 14, paddingTop: 12, borderTop: "0.5px solid var(--border-subtle)" }}>
            {[
              { color: "var(--accent-dim)", border: "var(--accent-border)", label: "Today" },
              { color: "var(--bg-surface)", border: "var(--border-subtle)", label: "Logged — tap to view" },
            ].map(({ color, border, label }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 12, height: 12, background: color, border: `0.5px solid ${border}`, borderRadius: 3 }} />
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── History ── */}
      {activeTab === "history" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {history.map((log) => {
            const workout = WORKOUT_PLAN[log.dayOverride ?? log.dayKey]
            const filledEx = log.exercises.filter((ex) => ex.sets.some((s) => s.weightKg || s.reps || s.durationSeconds))
            const totalSets = filledEx.reduce((acc, ex) => acc + ex.sets.filter((s) => s.weightKg || s.reps || s.durationSeconds).length, 0)
            return (
              <button key={log.id} onClick={() => setSelectedLog(log)}
                style={{ background: "var(--bg-surface)", border: "0.5px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "14px 16px", cursor: "pointer", textAlign: "left", fontFamily: "inherit", width: "100%", display: "flex", alignItems: "center", gap: 14 }}>
                <DayBadge icon={workout.icon} size={44} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {workout.label}
                    {log.dayOverride && <span style={{ fontSize: 10, color: "var(--accent)", background: "var(--accent-dim)", borderRadius: 20, padding: "1px 7px", marginLeft: 8 }}>Swapped</span>}
                  </p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{formatDateFull(log.date)}</p>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{filledEx.length} ex</p>
                  <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{totalSets} sets</p>
                </div>
                <IcoChevRight />
              </button>
            )
          })}
        </div>
      )}

      {/* ── Personal Bests ── */}
      {activeTab === "pbs" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {pbs.length === 0 ? (
            <p style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)", fontSize: 14 }}>
              No weight data logged yet. Add weights in your next session!
            </p>
          ) : pbs.map((pb, i) => (
            <div key={pb.exerciseId} style={{
              background: "var(--bg-surface)",
              border: `0.5px solid ${i === 0 ? "var(--accent-border)" : "var(--border-subtle)"}`,
              borderRadius: "var(--radius-lg)", padding: "14px 16px",
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: "50%",
                background: i === 0 ? "var(--accent-dim)" : "var(--bg-elevated)",
                border: `0.5px solid ${i === 0 ? "var(--accent-border)" : "var(--border-subtle)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: i === 0 ? "var(--accent)" : "var(--text-muted)", flexShrink: 0,
                fontSize: 12,
              }}>
                {i === 0 ? <IcoTrophy /> : `#${i + 1}`}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pb.exerciseName}</p>
                <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{formatDateShort(pb.date)} · {WORKOUT_PLAN[pb.dayKey].shortLabel}</p>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <p style={{ fontSize: 16, fontWeight: 600, color: i === 0 ? "var(--accent)" : "var(--text-primary)" }}>{pb.weightKg} kg</p>
                {pb.reps > 0 && <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>× {pb.reps} reps</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedLog && <SessionDrawer log={selectedLog} onClose={() => setSelectedLog(null)} />}
    </div>
  )
}