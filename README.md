# HabitFlow

Habit Tracker Dashboard — monorepo npm workspaces.

| Workspace | Stack | Port |
|-----------|-------|------|
| `server/` | Node 20, Express, better-sqlite3, zod | 3001 |
| `client/` | React 18, Vite, TypeScript (strict), Tailwind, Recharts | 5173 (proxy `/api` → 3001) |

## Démarrage

```bash
npm install        # installe toutes les dépendances (server + client)
npm run seed       # crée server/data/habitflow.db : 5 habitudes × 90 jours
npm run dev        # lance l'API (3001) et le client (5173) en parallèle
```

Ouvrir http://localhost:5173.

## Scripts racine

| Script | Effet |
|--------|-------|
| `npm run dev` | server + client en parallèle (concurrently) |
| `npm run seed` | réinitialise et remplit la base SQLite |
| `npm test` | Vitest dans chaque workspace (Supertest côté server, Testing Library côté client) |
| `npm run typecheck` | `tsc --noEmit` dans chaque workspace |
| `npm run build` | build de production |

Chaque workspace doit exposer les scripts `dev`, `test`, `typecheck` (et `seed` pour server).

## Contrat d'API

```
GET    /api/habits                    -> Habit[] (currentStreak, bestStreak, last7: boolean[7])
POST   /api/habits                    -> 201 Habit
PATCH  /api/habits/:id                -> 200 Habit
DELETE /api/habits/:id                -> 204 (archive)
POST   /api/habits/:id/checkins {date}-> 201 (idempotent)
DELETE /api/habits/:id/checkins/:date -> 204
GET    /api/stats/summary             -> { activeHabits, todayRate, bestStreak, rate30d }
GET    /api/stats/heatmap?from&to     -> { date, count, total }[]
GET    /api/stats/trend?days=30       -> { date, rate }[]
GET    /api/stats/weekday             -> { weekday, rate }[]   (0 = lundi … 6 = dimanche)
```

Précisions validées par le lead (non cassantes) :
- `POST /api/habits/:id/checkins` renvoie l'`Habit` mis à jour (201) ; une date future → 400 `VALIDATION_ERROR`.
- `/api/stats/heatmap` : `from`/`to` par défaut = 365 derniers jours.
- `/api/stats/weekday` : agrégé sur les 90 derniers jours.
- Les stats ignorent les habitudes archivées.
- Check-in (POST/DELETE) sur une habitude archivée → 404 `NOT_FOUND`.

Erreurs : `{ "error": { "code": "VALIDATION_ERROR" | "NOT_FOUND" | "INTERNAL", "message": string } }`.
Dates `YYYY-MM-DD` (heure locale), taux entre 0 et 1.

### Règles métier

- `frequency = []` → tous les jours ; sinon liste de jours (0 = dimanche, `getDay()`).
- Un jour non planifié ne casse jamais une série.
- Aujourd'hui non coché ne casse pas la série en cours.
- `todayRate` = habitudes planifiées cochées aujourd'hui / habitudes planifiées aujourd'hui.

## Structure

```
server/            API Express (backend)
  src/             app, routes, db, streaks, stats
  tests/           Vitest + Supertest (qa)
client/            React + Vite (frontend)
  src/types/api.ts types partagés (miroir du contrat)
  src/dashboard/   page Dashboard (dataviz)
```

## Équipe

Construit par une équipe d'agents : `backend`, `frontend`, `dataviz`, `qa`, coordonnés par le lead.
Voir `TASKS.md` et `.claude/skills/habitflow-team/SKILL.md`.
