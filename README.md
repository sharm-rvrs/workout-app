# GainLog

GainLog is a workout tracking app with Supabase authentication, editable weekly programs, progress logging, and a Groq-powered coaching assistant.

## Stack

- Next.js 16 (App Router)
- React 19 + TypeScript
- Supabase Auth + Postgres
- Groq SDK (LLaMA models)
- Tailwind CSS 4 + custom CSS variables

## Core Features

- Multi-step sign up/sign in with verification-aware flows, including resend confirmation from sign-in
- Personalized onboarding recommendation with apply-before-action and in-modal customization
- Auth-aware home dashboard with per-user today workout from Supabase
- Bottom nav with profile avatar shortcut and dedicated profile page
- Weekly program editor (`/program`) with exercise-level customization
- Workout logging (`/log`) and progress tracking (`/progress`) using per-user `program_days`
- Per-exercise rest timer and custom YouTube links for added exercises
- AI chat and AI-generated program feedback using live profile/log context with reliable fallback history

## Prerequisites

- Node.js 20+
- npm 10+
- A Supabase project
- A Groq API key

## Environment Variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GROQ_API_KEY=your_groq_api_key
```

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are required by both browser and server Supabase clients.

## Local Development

```bash
npm install
npm run dev
```

App runs at `http://localhost:3000`.

## Scripts

- `npm run dev` - start development server
- `npm run build` - production build
- `npm run start` - run production server
- `npm run lint` - run ESLint
- `npm run postinstall` - apply dependency patches via `patch-package`

## Project Layout

```text
proxy.ts
app/
    api/
        chat/route.ts
        recommend-program/route.ts
    auth/
        signin/page.tsx
        signup/page.tsx
    profile/page.tsx
    onboarding/page.tsx
    program/page.tsx
    log/page.tsx
    progress/page.tsx
components/
    AppIcons.tsx
    Nav.tsx
    log/
        RestTimer.tsx
hooks/
lib/
    program-days.ts
    supabase/
    workout-data.ts
    types.ts
public/
    manifest.json
patches/
    groq-sdk+1.2.0.patch
```

## Authentication Notes

- If Supabase email confirmation is enabled, signup may create the account without creating an active session yet.
- If signup is attempted for an existing account, the app routes to `/auth/signin?exists=1` and shows an informational banner.
- In the verification flow, the app routes users to `/auth/signin?verify=1`, shows a verification banner, and offers a resend confirmation action with cooldown protection.
- A temporary local payload (`pending_signup_profile`) is used to finish profile setup after first successful sign-in.
- Profile page sign-out uses `supabase.auth.signOut()` and redirects to `/auth/signin`.

## Architecture Notes

- Program templates and workout logs are intentionally separate concerns:
    - `program_days` + `program_exercises` define what a user should train.
    - `workout_logs` + `exercise_logs` + `set_entries` store what the user actually completed.
- Home (`/`) and Log (`/log`) read per-user program templates from Supabase, then fallback to `WORKOUT_PLAN` only when user data is unavailable.
- Shared program-day mapping logic lives in `lib/program-days.ts`:
    - `fetchUserProgramByDay()` fetches and normalizes `program_days` for UI use.
    - `createExerciseLogsFromWorkoutDay()` builds default `ExerciseLog[]` from a selected day template.
- Log persistence is handled separately in `lib/workout-data.ts`, which keeps compatibility wrappers (`savelog`, `getLogs`, etc.) while syncing to Supabase.
- Onboarding recommendation apply (`app/api/recommend-program/route.ts`) persists `weekly_series` into `program_days` before start/customize transitions.
- Chat context (`app/api/chat/route.ts`) merges server workout-log context with a bounded client fallback payload so set-history answers stay available when server context is incomplete.
- When updating program behavior, prefer changing `lib/program-days.ts` first so Home and Log stay aligned.
- Request gating and auth/onboarding redirects run through `proxy.ts` (Next.js 16 convention), replacing the old `middleware.ts` convention.

## Troubleshooting

- `over_email_send_rate_limit`: wait a few minutes before retrying signup.
- `favicon.ico 404`: add a favicon file under `public/` if needed (non-blocking).
- TypeScript deprecation warning in Groq package is handled by the committed patch and auto-applied on install.
- Vercel typecheck error around `RecommendationResponse.profile`: align API and shared type shape so the response includes the expected `profile` structure.
- If you recently migrated from `middleware.ts` to `proxy.ts` and dev still references middleware, stop old `next dev` processes, clear `.next/`, and restart dev.

## Maintenance

- Keep shared UI icons in `components/AppIcons.tsx`.
- Prefer shared types in `lib/types.ts` and `lib/workout-data.ts` over duplicating interfaces in feature pages.