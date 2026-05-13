"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { WORKOUT_PLAN, getDayKeyFromStr, type DayKey } from "@/lib/workout-data"
import { todayStrPH, getGreetingPH, getThisWeekPH, formatDateFull, parseLocalDate } from "@/lib/dates"
import { useStreak, useCurrentWeek, useWorkoutLog } from "@/hooks/useWorkoutLog"
import WorkoutIcon, { DayBadge } from "@/components/WorkoutIcon"

const DAY_ABBR: Record<DayKey, string> = {
  sunday: "Sun", monday: "Mon", tuesday: "Tue", wednesday: "Wed",
  thursday: "Thu", friday: "Fri", saturday: "Sat",
}

export default function HomePage() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const today = todayStrPH()
  const todayKey = getDayKeyFromStr(today)
  const todayWorkout = WORKOUT_PLAN[todayKey]
  const streak = useStreak()
  const week = useCurrentWeek()
  const { getByDate } = useWorkoutLog()
  const weekDateStrs = getThisWeekPH()

  const alreadyLogged = mounted ? !!getByDate(today) : false
  const isRestDay = todayKey === "sunday"
  const PREVIEW_LIMIT = 4
  const preview = todayWorkout.exercises.slice(0, PREVIEW_LIMIT)
  const overflow = todayWorkout.exercises.length - PREVIEW_LIMIT

  return (
    <div style={{ paddingTop: 24, paddingBottom: 8 }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 18 }}>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
          {mounted ? getGreetingPH() : "Hello"}
        </p>
        <h1 style={{ fontSize: 22, fontWeight: 500, color: "var(--text-primary)" }}>
          {mounted ? formatDateFull(today) : "—"}
        </h1>
      </div>

      {/* ── Today's card ── */}
      <div style={{
        background: "var(--bg-surface)",
        border: "0.5px solid var(--border-default)",
        borderRadius: "var(--radius-xl)", overflow: "hidden", marginBottom: 20,
      }}>
        {!isRestDay && <div style={{ height: 3, background: "var(--accent)" }} />}

        <div style={{ padding: "16px 18px 18px" }}>
          {/* Badge + title row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: isRestDay ? "var(--bg-elevated)" : "var(--accent-dim)",
                border: `0.5px solid ${isRestDay ? "var(--border-subtle)" : "var(--accent-border)"}`,
                borderRadius: 20, padding: "3px 10px", marginBottom: 8,
              }}>
                <WorkoutIcon icon={todayWorkout.icon} size={12}
                  color={isRestDay ? "var(--text-muted)" : "var(--accent)"} strokeWidth={2} />
                <span style={{
                  fontSize: 10, fontWeight: 500,
                  color: isRestDay ? "var(--text-muted)" : "var(--accent)",
                  textTransform: "uppercase", letterSpacing: "0.08em",
                }}>Today</span>
              </div>
              <h2 style={{ fontSize: 19, fontWeight: 500, color: "var(--text-primary)", lineHeight: 1.2 }}>
                {todayWorkout.label}
              </h2>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 3 }}>
                {todayWorkout.focus}
              </p>
            </div>

            {mounted && alreadyLogged && !isRestDay && (
              <div style={{
                background: "rgba(76,175,125,0.12)", border: "0.5px solid rgba(76,175,125,0.3)",
                borderRadius: 20, padding: "4px 10px", fontSize: 11, fontWeight: 500,
                color: "var(--success)", whiteSpace: "nowrap", flexShrink: 0,
              }}>
                Logged
              </div>
            )}
          </div>

          {/* Meta */}
          {!isRestDay && (
            <div style={{
              display: "flex", gap: 16, marginBottom: 14,
              paddingBottom: 14, borderBottom: "0.5px solid var(--border-subtle)",
            }}>
              {[
                { icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>, text: todayWorkout.duration },
                { icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 5v14M18 5v14M6 9h12M6 15h12" /></svg>, text: todayWorkout.equipment },
              ].map(({ icon, text }, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  {icon}
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Exercise preview */}
          {!isRestDay && preview.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              {preview.map((ex) => (
                <div key={ex.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{ex.name}</span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap", marginLeft: 12 }}>
                    {ex.sets} × {ex.reps ?? ex.duration}
                  </span>
                </div>
              ))}
              {overflow > 0 && (
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  +{overflow} more exercise{overflow > 1 ? "s" : ""}
                </span>
              )}
            </div>
          )}

          {/* Rest day note */}
          {isRestDay && (
            <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7, margin: "4px 0 16px" }}>
              Rest, eat well, and sleep 7–8 hrs. Muscle is built during recovery — not in the gym.
            </p>
          )}

          {/* CTA */}
          {!isRestDay && (
            <Link href="/log" style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              background: alreadyLogged ? "transparent" : "var(--accent)",
              border: alreadyLogged ? "0.5px solid var(--border-default)" : "none",
              borderRadius: "var(--radius-md)",
              color: alreadyLogged ? "var(--text-secondary)" : "#fff",
              fontSize: 14, fontWeight: 500, padding: "12px 0", textDecoration: "none",
            }}>
              {alreadyLogged ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Edit today's log
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="1.5" strokeLinecap="round">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  Start logging
                </>
              )}
            </Link>
          )}
        </div>
      </div>

      {/* ── Weekly strip ── */}
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
          This week
        </p>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none", padding: "2px 0 6px" }}>
          {weekDateStrs.map(({ dateStr }) => {
            const key = getDayKeyFromStr(dateStr);
            const day = WORKOUT_PLAN[key];
            const isToday = dateStr === today;
            const midnight = parseLocalDate(today);
            const dayDate = parseLocalDate(dateStr);
            const isPast = dayDate < midnight;

            return (
              <Link key={dateStr} href={`/log?date=${dateStr}`} style={{ textDecoration: "none", flexShrink: 0 }}>
                <div style={{
                  width: 62,
                  background: isToday ? "var(--accent-dim)" : "var(--bg-surface)",
                  border: `0.5px solid ${isToday ? "var(--accent-border)" : "var(--border-subtle)"}`,
                  borderRadius: "var(--radius-md)",
                  padding: "10px 6px",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                  opacity: isPast && !isToday ? 0.45 : 1,
                }}>
                  <span style={{ fontSize: 9, fontWeight: 500, color: isToday ? "var(--accent)" : "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {DAY_ABBR[key]}
                  </span>
                  <WorkoutIcon icon={day.icon} size={18}
                    color={isToday ? "var(--accent)" : "var(--text-muted)"} strokeWidth={1.5} />
                  <span style={{ fontSize: 9, color: isToday ? "var(--accent)" : "var(--text-muted)", textAlign: "center", lineHeight: 1.3 }}>
                    {day.shortLabel}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        {[
          {
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>,
            label: "Streak", value: mounted ? streak : "—", sub: "days in a row",
          },
          {
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
            label: "Program", value: mounted ? `Wk ${week}` : "—", sub: "of 12 weeks",
          },
        ].map(({ icon, label, value, sub }) => (
          <div key={label} style={{
            flex: 1, background: "var(--bg-surface)",
            border: "0.5px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)", padding: "14px 12px",
            display: "flex", flexDirection: "column", gap: 3,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              {icon}
              <span style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
            </div>
            <span style={{ fontSize: 26, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1 }}>{value}</span>
            <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{sub}</span>
          </div>
        ))}
      </div>

      {/* ── Nutrition ── */}
      <div style={{
        background: "var(--bg-surface)", border: "0.5px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)", padding: "14px 16px",
      }}>
        <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
          Daily nutrition targets
        </p>
        {[
          { label: "Protein", value: "100–110g" },
          { label: "Water", value: "2.5–3L" },
          { label: "Caloric deficit", value: "~300–400 kcal" },
        ].map(({ label, value }) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{label}</span>
            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{value}</span>
          </div>
        ))}
        <p style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.6, borderTop: "0.5px solid var(--border-subtle)", paddingTop: 10, marginTop: 4 }}>
          Eat protein within 1–2 hrs post-workout for best muscle protein synthesis.
        </p>
      </div>
    </div>
  )
}