/**
 * All date helpers in one place.
 * Always use Asia/Manila timezone so the date never drifts
 * between midnight and 8am PH time (UTC offset issue).
 */ 

const TZ = "Asia/Manila"

// Returns "YYYY-MM-DD" in PH time — use this everywhere instead of
// new Date().toISOString().split("T")[0]  ← that's UTC, wrong for PH!
export function todayStrPH(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date())
}

// Convert any Date object → "YYYY-MM-DD" in PH time
export function dateToStrPH(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(date)
}

// Parse "YYYY-MM-DD" as a LOCAL date (avoids UTC shift when reading back)
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(y, m - 1, d)
}

// full readable label in PH locale
export function formatDateFull(dateStr: string): string {
  return parseLocalDate(dateStr).toLocaleDateString("en-PH", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

// short label
export function formatDateShort(dateStr: string): string {
  return parseLocalDate(dateStr).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
  })
}

// "Good morning / afternoon / evening" based on PH hour
export function getGreetingPH(): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TZ,
      hour: "numeric",
      hour12: false,
    }).format(new Date())
  )
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

// Day-of-week index (0=Sun … 6=Sat) in PH time
export function getDayOfWeekPH(date?: Date): number {
  const d = date ?? new Date()
  const dayName = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "short",
  }).format(d)
  return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].indexOf(dayName)
}

// Returns Mon–Sun of the current week as { dateStr }[] in PH time
export function getThisWeekPH(): { dateStr: string }[] {
  const todayDow = getDayOfWeekPH() // 0=Sun
  // Roll back to Monday
  const mondayOffset = (todayDow + 6) % 7
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - mondayOffset + i)
    return { dateStr: dateToStrPH(d) }
  })
}