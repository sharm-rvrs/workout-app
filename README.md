# GainLog

GainLog is a Next.js workout app with authenticated user profiles, editable weekly training programs, workout logging with session duration tracking, progress analytics, and an AI coaching experience.

This README reflects the current codebase architecture across frontend, API/backend, and data schema contracts.

## Tech Stack

- Next.js 16 (App Router)
- React 19 + TypeScript
- Supabase Auth + Postgres (via @supabase/ssr)
- Groq SDK for AI responses
- Inline styles + CSS variables (global theme tokens in app/globals.css)
- Vitest for unit tests

## What The App Does

- Multi-step auth flow (sign up, sign in, verification-aware UX)
- Onboarding recommendation flow with AI/fallback plan suggestions
- Editable weekly program builder per user
- Workout logger with:
    - per-exercise sets/reps/weight/timed sets
    - start/pause/resume/reset/finish workout timer
    - auto-save on Finish with session duration
    - cross-page timer continuity via localStorage
- Progress page with calendar, history drawer, streaks, and personal bests
- AI chat using live profile + workout context, with safe client-log fallback merge

## Environment Variables

Create .env.local in project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GROQ_API_KEY=your_groq_api_key
```

Notes:
- NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required in both browser and server contexts.
- GROQ_API_KEY is required for app/api/chat/route.ts and app/api/recommend-program/route.ts.

## Scripts

- npm run dev
- npm run build
- npm run start
- npm run lint
- npm run test
- npm run postinstall

## Frontend Map

Core routes:
- / (Home): today workout, weekly strip, streak/week cards, nutrition targets, AI Coach quick entry
- /log: daily workout logging + timer + save flow
- /progress: calendar/history/PB analytics
- /program: program day and exercise editor
- /profile: account/goal/body metrics + stats
- /chat: AI coach UI
- /onboarding: recommendation preview + apply/customize
- /auth/signin and /auth/signup

Navigation:
- Bottom nav now uses 5 tabs: Home, Log, Progress, Program, Profile
- AI chat is accessed from compact Home quick-action entry instead of a dedicated tab

Primary UI files:
- app/page.tsx
- app/log/page.tsx
- app/progress/page.tsx
- app/program/page.tsx
- app/profile/page.tsx
- app/chat/page.tsx
- components/Nav.tsx
- components/log/*

## Backend/API Map

Route handlers:
- app/api/chat/route.ts
    - Validates/sanitizes incoming chat messages
    - Loads user profile + workout logs from DB
    - Falls back to bounded client logs when DB log detail is incomplete
    - Generates response via Groq

- app/api/recommend-program/route.ts
    - GET: returns recommendation text + deterministic weekly series
    - POST: applies recommended weekly series into program_days

Request gating/auth middleware layer:
- proxy.ts
    - Redirects unauthenticated users to /auth/signin
    - Redirects authenticated users away from auth pages
    - Enforces onboarding redirect when profile.program_confirmed_at is missing (except safe paths)

Supabase clients:
- lib/supabase/client.ts (browser)
- lib/supabase/server.ts (server)

## Data Layer And Schema Contract

There is no SQL migration folder in this repo; schema below is inferred from runtime queries.

Core tables used:

- profiles
    - id
    - full_name
    - role
    - birthday
    - age
    - weight_kg
    - height_cm
    - goal
    - fitness_level
    - program_confirmed_at
    - onboarding_completed_at
    - onboarding_completion_source
    - onboarding_complete

- program_days
    - id
    - user_id
    - day_key
    - label
    - short_label
    - focus
    - duration
    - equipment
    - is_rest
    - icon_key
    - order_index

- program_exercises
    - id
    - user_id
    - program_day_id
    - category_id
    - name
    - sets
    - reps
    - duration_label
    - is_timed
    - equipment
    - youtube_url
    - youtube_search
    - tip
    - order_index

- exercise_categories
    - id
    - name
    - icon_key
    - sort_order

- workout_logs
    - id
    - user_id
    - date
    - completed_at
    - optional/compat columns used when available:
        - day_key
        - day_override
        - skipped_exercise_ids
        - session_duration_seconds

- exercise_logs
    - id
    - workout_log_id
    - exercise_name
    - optional/compat columns used when available:
        - exercise_id
    - is_custom
    - is_timed
    - notes
    - order_index

- set_entries
    - exercise_log_id
    - set_number (optional/compat)
    - weight_kg
    - reps
    - duration_seconds

- RPC function
    - copy_default_program(p_user_id)

## Sync And Compatibility Behavior

Workout log sync (lib/workout-data.ts) is designed to survive schema drift:

- Uses local cache + optimistic UI updates
- Hydrates from Supabase when possible
- Supports partial/legacy schemas through capability flags persisted in localStorage
- Detects missing columns and retries narrower queries/writes
- New duration column path:
    - reads session_duration_seconds when available
    - writes session_duration_seconds when available
    - automatically falls back when missing

Timer persistence behavior:
- Log timer state is persisted in localStorage
- Timer continues after page navigation
- Finish finalizes elapsed time and auto-saves the workout log

## Auth And Onboarding Flow

- Sign up supports deferred completion for email-confirmation flows
- Pending profile payload is temporarily stored in localStorage and finalized after first sign-in
- Sign in handles verification banners and resend confirmation cooldown
- Onboarding completion is persisted with graceful fallback if legacy profile columns are missing

## Key Shared Modules

- lib/workout-data.ts: workout models, local cache, Supabase hydration/save/delete, schema fallback logic
- lib/program-days.ts: fetch and normalize per-user program day templates
- lib/recommendation.ts: deterministic weekly-series + fallback recommendation generation
- lib/onboarding.ts: onboarding completion persistence and transition helpers
- hooks/useWorkoutLog.ts: client hooks for logs/streak/PBs/week
- lib/telemetry.ts: optional frontend event tracking bridge

## Testing

Run:

```bash
npm run test
```

Current test files include:
- hooks/useWorkoutLog.test.ts
- lib/workout-data.catalog.test.ts
- lib/recommendation.test.ts
- lib/onboarding.test.ts
- lib/telemetry.test.ts
- components/log/ExerciseCard.test.ts

## Local Development

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Troubleshooting

- over_email_send_rate_limit: wait before retrying signup
- If auth redirects feel stale after changing proxy logic, restart dev server and clear .next
- If chat/recommendation fails, verify GROQ_API_KEY
- If log syncing partially fails on older DBs, check missing columns in workout_logs/exercise_logs/set_entries and rely on built-in compatibility fallback

## Notes For Contributors

- Prefer extending shared data modules (lib/workout-data.ts and lib/program-days.ts) before duplicating logic in page files
- Keep schema changes backward compatible when possible; this app intentionally supports partial legacy deployments
- When adjusting onboarding/auth behavior, test proxy.ts redirects and both email-confirmed and email-unconfirmed sign-up paths