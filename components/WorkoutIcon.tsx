import type { WorkoutIconKey } from "@/lib/workout-data"

interface WorkoutIconProps {
  icon: WorkoutIconKey
  size?: number
  color?: string
  strokeWidth?: number
}

export default function WorkoutIcon({
  icon,
  size = 20,
  color = "currentColor",
  strokeWidth = 1.5,
}: WorkoutIconProps) {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  }

  switch (icon) {
    // Upper Push
    case "push":
      return (
        <svg {...props}>
          <path d="M6 5v14" />
          <path d="M18 5v14" />
          <path d="M6 9h12" />
          <path d="M6 15h12" />
          <path d="M4 7v10" strokeWidth={strokeWidth + 1} />
          <path d="M20 7v10" strokeWidth={strokeWidth + 1} />
          <path d="M2 9v6" strokeWidth={strokeWidth + 1} />
          <path d="M22 9v6" strokeWidth={strokeWidth + 1} />
        </svg>
      )

    // Lower Body
    case "legs":
      return (
        <svg {...props}>
          <circle cx="12" cy="4" r="1.5" fill={color} stroke="none" />
          <path d="M12 6v5l-3 4" />
          <path d="M12 11l3 4" />
          <path d="M9 15l-1 5" />
          <path d="M15 15l1 5" />
          <path d="M8 20h2" />
          <path d="M14 20h2" />
        </svg>
      )

    // Active Recovery 
    case "recovery":
      return (
        <svg {...props}>
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
      )

    // Upper Pull 
    case "pull":
      return (
        <svg {...props}>
          <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
          <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
          <line x1="6" y1="1" x2="6" y2="4" />
          <line x1="10" y1="1" x2="10" y2="4" />
          <line x1="14" y1="1" x2="14" y2="4" />
        </svg>
      )

    // Full Body + Core 
    case "fire":
      return (
        <svg {...props}>
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      )

    // HIIT 
    case "hiit":
      return (
        <svg {...props}>
          <circle cx="13" cy="4" r="1.5" fill={color} stroke="none" />
          <path d="M8 17l1.5-5L13 15l2-4" />
          <path d="M15 11l2-3-3-2" />
          <path d="M7 20h3" />
          <path d="M11 20l2-3" />
          <path d="M3 11l3-1 1.5 3" />
        </svg>
      )

    // Rest
    case "rest":
      return (
        <svg {...props}>
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )

    default:
      return null
  }
}


interface DayBadgeProps {
  icon: WorkoutIconKey
  size?: number
  active?: boolean
}

export function DayBadge({ icon, size = 36, active = false }: DayBadgeProps) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        background: active ? "var(--accent-dim)" : "var(--bg-elevated)",
        border: `0.5px solid ${active ? "var(--accent-border)" : "var(--border-default)"}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        color: active ? "var(--accent)" : "var(--text-secondary)",
      }}
    >
      <WorkoutIcon icon={icon} size={size * 0.5} strokeWidth={1.8} />
    </div>
  )
}