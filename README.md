# GainLog

Personal body recomposition workout tracker with an AI gym assistant.

Built with Next.js 14, Tailwind CSS, LLaMA 3.3 70B

---

## Features

- **Daily workout logging** — weight × reps or duration per set, per exercise
- **Flexible sessions** — skip exercises, add custom ones, swap workout type for any day
- **Progress tracking** — calendar view, session history, personal bests per exercise
- **AI assistant** — knows your full program, today's date (PH time), and your logged data
- **Streak + week counter** — tracks consistency across the 8–12 week program
- **PWA-ready** — installable on iOS and Android from the browser

---

## Tech Stack

| Layer | Tool |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + CSS variables |
| AI | Groq API — LLaMA 3.3 70B |
| Storage | localStorage (Supabase-ready) |
| Deployment | Vercel |

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/workout-app.git
cd workout-app
npm install
```

### 2. Set up environment variables

Create a `.env.local` file in the project root:

```env
GROQ_API_KEY=your_groq_api_key_here
```

Get a free Groq API key at [console.groq.com](https://console.groq.com) → API Keys → Create key.

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
workout-app/
├── app/
│   ├── layout.tsx          # Root layout, fonts, Nav
│   ├── page.tsx            # Home — today's workout + weekly strip
│   ├── log/page.tsx        # Log workout — date picker, exercise cards
│   ├── progress/page.tsx   # Progress — calendar, history, personal bests
│   ├── chat/page.tsx       # AI assistant chat
│   └── api/chat/route.ts   # Groq API route
├── components/
│   ├── Nav.tsx             # Bottom navigation bar
│   ├── WorkoutIcon.tsx     # SVG icons for each workout type
│   ├── AppIcons.tsx        # Shared inline SVG icons
│   ├── log/
│   │   ├── ExerciseCard.tsx
│   │   ├── SetRow.tsx
│   │   ├── AddExerciseForm.tsx
│   │   └── DayOverridePicker.tsx
│   └── ToasterProvider.tsx
├── hooks/
│   └── useWorkoutLog.ts    # Streak, PBs, week number, CRUD
├── lib/
│   ├── workout-data.ts     # All exercise data + localStorage helpers
│   ├── dates.ts            # PH timezone date helpers
│   └── buildLogContext.ts  # Builds AI-readable log summary
├── public/
│   ├── manifest.json       # PWA manifest
│   └── icons/              # icon-192.png, icon-512.png
└── types/
    └── types.ts
```

---

## Future Improvements

- **Supabase** — swap localStorage for cloud sync + auth (multi-device, data backup)
- **Progress charts** — weight lifted over time per exercise using Recharts
- **Rest timer** — countdown between sets
- **Notification reminders** — "Time to train" push notifications via service worker
- **Export** — download logs as CSV or PDF

---

## Notes

- All dates use **Asia/Manila (UTC+8)** timezone — the app will always show the correct PH date and day
- Workout logs are stored in `localStorage` under the key `workout_logs_v2`
- The AI has guardrails: fitness and nutrition topics only, 20-message session limit, 1000-character input limit, prompt injection detection
- The AI reads your actual logged data (today's session + last 6 sessions + personal bests) on every chat request