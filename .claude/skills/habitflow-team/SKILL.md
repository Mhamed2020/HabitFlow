---
name: habitflow-team
description: Conventions, API contract and team rules for the HabitFlow habit tracker
dashboard. Use whenever working on any part of HabitFlow (server, client, dashboard,
tests), when creating or claiming a task, or when talking to another teammate.
---
# HabitFlow - team playbook
## 1. Stack
- Monorepo, npm workspaces: server/ and client/
- server: Node >=22.22.2 (required by locked deps: vitest, jsdom), Express, better-sqlite3, zod. Port 3001. DB file: server/data/habitflow.db
- client: React 18 + Vite + TypeScript (strict), Tailwind, Recharts. Port 5173, proxy /api -> 3001
- tests: Vitest + Supertest (server), Vitest + Testing Library (client)
## 2. File ownership (never edit a file you do not own)
| Teammate | Owns |
|----------|------|
| lead | root package.json, README.md, .claude/ |
| backend | server/** (except server/tests/**) |
| frontend | client/src/** except client/src/dashboard/** and *.test.tsx |
| dataviz | client/src/dashboard/** |
| qa | server/tests/**, client/src/**/*.test.tsx |
Need a change in someone else's file? Send them a message with the exact change.
## 3. API contract (source of truth - do not change without the lead's approval)
GET /api/habits -> Habit[] (with currentStreak, bestStreak, last7: boolean[7])
POST /api/habits -> 201 Habit
PATCH /api/habits/:id -> 200 Habit
DELETE /api/habits/:id -> 204 (archive)
POST /api/habits/:id/checkins {date}-> 201 (idempotent)
DELETE /api/habits/:id/checkins/:date -> 204
GET /api/stats/summary -> { activeHabits, todayRate, bestStreak, rate30d }
GET /api/stats/heatmap?from&to -> { date, count, total }[]
GET /api/stats/trend?days=30 -> { date, rate }[]
GET /api/stats/weekday -> { weekday, rate }[] (0 = Monday ... 6 = Sunday)
Errors: { "error": { "code": "VALIDATION_ERROR" | "NOT_FOUND" | "INTERNAL", "message": string } }
Dates: always 'YYYY-MM-DD' local time. Rates: numbers between 0 and 1.
Shared TS types live in client/src/types/api.ts (owned by frontend, mirrors this contract).
## 4. Business rules
- frequency = [] means every day; otherwise list of weekdays (0 = Sunday, JS getDay()).
- A day that is not scheduled never breaks a streak.
- Today not yet checked does not break the current streak.
- todayRate = checked scheduled habits today / scheduled habits today.
## 5. Team protocol
- Start by reading this skill, then claim ONE task from the shared task list.
- Contract question or change -> message the lead. Bug found -> message the owner directly
with: route/file, steps to reproduce, expected vs actual.
- When an endpoint is ready, backend messages frontend and dataviz with a curl example.
- Mark a task completed only when its tests pass. Then claim the next unblocked task.
- Keep messages short and factual. No broadcasting: one message per recipient.
## 6. Definition of done
- npm run dev starts both apps, npm run seed fills 5 habits x 90 days, npm test is green.
- UI: responsive from 375px, light/dark theme, empty / loading / error states.
- No console errors, no TypeScript errors (npm run typecheck).