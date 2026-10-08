# HabitFlow — shared task list

Protocole : réclamer UNE tâche à la fois (mettre `[~] @nom`), la passer à `[x]` quand ses tests passent.
Une tâche n'est réclamable que si toutes ses dépendances (`deps`) sont `[x]`.
Chaque coéquipier ne modifie QUE les lignes de ses propres tâches dans ce fichier.
Statuts : `[ ]` à faire · `[~]` en cours · `[x]` terminé · `[!]` bloqué (préciser pourquoi)

## backend (server/**, sauf server/tests/**)

| ID | Statut | Tâche | deps |
|----|--------|-------|------|
| B1 | [x] | Setup server/ : package.json (scripts `dev`, `seed`, `test`, `typecheck`), tsconfig, Express app exportée (`createApp(db)`) séparée de `listen`, middleware d'erreurs au format du contrat, zod | — |
| B2 | [x] | Schéma SQLite better-sqlite3 (`habits`, `checkins` UNIQUE(habit_id,date)), DB injectable (`:memory:` pour les tests), fichier `server/data/habitflow.db` | B1 |
| B3 | [x] | Routes habits : GET / POST / PATCH / DELETE (archive) avec validation zod, 404 NOT_FOUND | B2 |
| B4 | [x] | Routes checkins : POST `{date}` idempotent 201, DELETE `/:date` 204 ; module de calcul des séries (`currentStreak`, `bestStreak`, `last7`) selon la fréquence | B3 |
| B5 | [x] | Routes `/api/stats/summary`, `/heatmap?from&to`, `/trend?days`, `/weekday` | B4 |
| B6 | [x] | Script seed : 5 habitudes × 90 jours (fréquences variées, taux réalistes) | B4 |

## frontend (client/src/**, sauf dashboard/** et *.test.tsx)

| ID | Statut | Tâche | deps |
|----|--------|-------|------|
| F1 | [x] | Setup client/ : Vite + React 18 + TS strict + Tailwind (darkMode class) + Recharts + Vitest/Testing Library/jsdom, proxy `/api`→3001, scripts `dev`, `test`, `typecheck` | — |
| F2 | [x] | `client/src/types/api.ts` (miroir exact du contrat) + client API typé `client/src/api/` (gestion des erreurs `{error:{code,message}}`) | F1 |
| F3 | [x] | Layout responsive (375px+), navigation Habits / Dashboard, thème clair/sombre persisté ; monte `client/src/dashboard/DashboardPage.tsx` (export par défaut) sur la route Dashboard | F1 |
| F4 | [x] | Liste des habitudes + formulaire création/édition (nom, couleur, fréquence), archivage ; états vide/chargement/erreur | F2, F3, B3 |
| F5 | [x] | Grille de check-in des 7 derniers jours avec mise à jour optimiste + rollback en cas d'erreur | F4, B4 |

## dataviz (client/src/dashboard/**)

| ID | Statut | Tâche | deps |
|----|--------|-------|------|
| D1 | [x] | `DashboardPage.tsx` (export default) : grille responsive, hooks de données (`useStats`) basés sur `types/api.ts`, états vide/chargement/erreur | F2, F3 |
| D2 | [x] | 4 KPI cards (habitudes actives, taux du jour, meilleure série, taux 30j) | D1, B5 (summary) |
| D3 | [x] | Heatmap annuelle type GitHub (intensité = count/total) | D1, B5 (heatmap) |
| D4 | [x] | Courbe de complétion 30 jours (Recharts) | D1, B5 (trend) |
| D5 | [x] | Barres par jour de la semaine (lundi→dimanche) | D1, B5 (weekday) |
| D6 | [x] | Classement des habitudes (par série / taux) | D1, B3 |

## qa (server/tests/**, client/src/**/*.test.tsx)

| ID | Statut | Tâche | deps |
|----|--------|-------|------|
| Q1 | [x] @qa | Setup tests serveur (Vitest + Supertest sur `createApp` avec DB `:memory:`, helpers de fixtures) | B1, B2 |
| Q2 | [x] @qa | Tests routes habits (CRUD, validation, 404, archive) | B3, Q1 |
| Q3 | [x] @qa | Tests checkins + séries : idempotence, jours non planifiés, aujourd'hui non coché, best vs current, last7 | B4, Q1 |
| Q4 | [x] @qa | Tests routes stats (summary, heatmap, trend, weekday) — total ≥ 15 tests serveur | B5, Q1 |
| Q5 | [x] @qa | ≥ 5 tests de composants (formulaire, grille check-in optimiste, toggle thème, KPI cards, état vide dashboard) | F4, F5, D2 |
| Q6 | [x] @qa | Revue de code des autres ; chaque bug envoyé DIRECTEMENT au propriétaire (route/fichier, repro, attendu vs obtenu) | B5, F5, D6 |

## Lead

| ID | Statut | Tâche | deps |
|----|--------|-------|------|
| L1 | [x] | Monorepo (workspaces, scripts racine), README, TASKS.md | — |
| L2 | [x] | Intégration : `npm install`, `seed`, `test`, `typecheck` verts ; synthèse | toutes |
