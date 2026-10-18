// In-memory stand-in for the API, used when the hosted backend cannot be reached
// (see `request()` in ./client). Mirrors the server's business rules
// (server/src/streaks.ts, server/src/stats.ts) closely enough for a demo.
import { addDays, parseDate, todayStr } from '../lib/dates';
import { ApiError, type Habit, type HabitInput, type HabitPatch } from '../types/api';

interface DemoHabit {
  id: number;
  name: string;
  color: string;
  frequency: number[];
  createdAt: string;
  archived: boolean;
  checks: Set<string>;
}

const jsWeekday = (date: string) => parseDate(date).getDay();
const isScheduled = (frequency: number[], date: string) =>
  frequency.length === 0 || frequency.includes(jsWeekday(date));
const rate = (count: number, total: number) => (total === 0 ? 0 : count / total);

function dateRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

function streaks(h: DemoHabit, today: string) {
  if (h.checks.size === 0) return { currentStreak: 0, bestStreak: 0 };
  let earliest = today;
  for (const d of h.checks) if (d < earliest) earliest = d;
  let currentStreak = 0;
  for (let d = today; d >= earliest; d = addDays(d, -1)) {
    if (!isScheduled(h.frequency, d)) continue;
    if (h.checks.has(d)) currentStreak++;
    else if (d === today) continue;
    else break;
  }
  let bestStreak = 0;
  let run = 0;
  for (let d = earliest; d <= today; d = addDays(d, 1)) {
    if (!isScheduled(h.frequency, d)) continue;
    if (h.checks.has(d)) bestStreak = Math.max(bestStreak, ++run);
    else if (d !== today) run = 0;
  }
  return { currentStreak, bestStreak: Math.max(bestStreak, currentStreak) };
}

function toHabit(h: DemoHabit, today = todayStr()): Habit {
  return {
    id: h.id,
    name: h.name,
    color: h.color,
    frequency: [...h.frequency],
    createdAt: h.createdAt,
    archived: h.archived,
    ...streaks(h, today),
    last7: Array.from({ length: 7 }, (_, i) => h.checks.has(addDays(today, i - 6))),
  };
}

/** Same habits and deterministic pseudo-random history as `npm run seed`. */
function seed(): DemoHabit[] {
  let s = 42;
  const rand = () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32;
  const t = todayStr();
  const start = addDays(t, -89);
  const defs = [
    { name: 'Meditation', color: '#8b5cf6', frequency: [] as number[], rate: 0.85 },
    { name: 'Workout', color: '#ef4444', frequency: [1, 3, 5], rate: 0.8 },
    { name: 'Reading', color: '#3b82f6', frequency: [] as number[], rate: 0.65 },
    { name: 'Drink 2L of water', color: '#06b6d4', frequency: [] as number[], rate: 0.75 },
    { name: 'Weekly review', color: '#f59e0b', frequency: [0], rate: 0.9 },
  ];
  return defs.map((d, i) => {
    const checks = new Set<string>();
    for (let k = 0; k < 90; k++) {
      const date = addDays(start, k);
      if (!isScheduled(d.frequency, date)) continue;
      const wd = jsWeekday(date);
      const weekend = wd === 0 || wd === 6 ? -0.1 : 0;
      const trendBoost = (k / 90) * 0.1 - 0.05;
      if (date !== t && rand() < d.rate + weekend + trendBoost) checks.add(date);
    }
    return { id: i + 1, name: d.name, color: d.color, frequency: d.frequency, createdAt: start, archived: false, checks };
  });
}

let habits: DemoHabit[] | null = null;
const store = () => (habits ??= seed());

/** Reset the demo data (tests). */
export function resetDemo() {
  habits = null;
}

const notFound = () => new ApiError('NOT_FOUND', 'Habit not found', 404);
const invalid = (message: string) => new ApiError('VALIDATION_ERROR', message, 400);

function find(id: number, activeOnly = false): DemoHabit {
  const h = store().find((x) => x.id === id);
  if (!h || (activeOnly && h.archived)) throw notFound();
  return h;
}

function dayCounts(active: DemoHabit[], date: string) {
  let count = 0;
  let total = 0;
  for (const h of active) {
    if (!isScheduled(h.frequency, date)) continue;
    const checked = h.checks.has(date);
    if (date < h.createdAt && !checked) continue;
    total++;
    if (checked) count++;
  }
  return { count, total };
}

/** Handle one API call against the in-memory data. Same paths and payloads as the real API. */
export function handleDemo(method: string, path: string, body?: unknown): unknown {
  const url = new URL(path, 'http://demo');
  const parts = url.pathname.split('/').filter(Boolean); // ['api', ...]
  const t = todayStr();
  const active = () => store().filter((h) => !h.archived);

  if (parts[1] === 'habits') {
    const id = parts[2] !== undefined ? Number(parts[2]) : undefined;
    if (id === undefined) {
      if (method === 'GET') return active().map((h) => toHabit(h, t));
      const input = body as HabitInput;
      const name = input.name?.trim();
      if (!name) throw invalid('name: name is required');
      const h: DemoHabit = {
        id: Math.max(0, ...store().map((x) => x.id)) + 1,
        name,
        color: input.color ?? '#6366f1',
        frequency: [...(input.frequency ?? [])].sort((a, b) => a - b),
        createdAt: t,
        archived: false,
        checks: new Set(),
      };
      store().push(h);
      return toHabit(h, t);
    }
    if (parts[3] === 'checkins') {
      const h = find(id, true);
      if (method === 'POST') {
        const { date } = body as { date: string };
        if (date > t) throw invalid('date: cannot check in on a future date');
        h.checks.add(date);
        return toHabit(h, t);
      }
      h.checks.delete(parts[4]);
      return undefined;
    }
    const h = find(id);
    if (method === 'DELETE') {
      h.archived = true;
      return undefined;
    }
    const patch = body as HabitPatch;
    if (patch.name !== undefined) h.name = patch.name.trim();
    if (patch.color !== undefined) h.color = patch.color;
    if (patch.frequency !== undefined) h.frequency = [...patch.frequency].sort((a, b) => a - b);
    if (patch.archived !== undefined) h.archived = patch.archived;
    return toHabit(h, t);
  }

  if (parts[1] === 'stats') {
    const habitsNow = active();
    switch (parts[2]) {
      case 'summary': {
        const today = dayCounts(habitsNow, t);
        let count = 0;
        let total = 0;
        for (const d of dateRange(addDays(t, -29), t)) {
          const c = dayCounts(habitsNow, d);
          count += c.count;
          total += c.total;
        }
        return {
          activeHabits: habitsNow.length,
          todayRate: rate(today.count, today.total),
          bestStreak: habitsNow.reduce((m, h) => Math.max(m, streaks(h, t).bestStreak), 0),
          rate30d: rate(count, total),
        };
      }
      case 'heatmap': {
        const from = url.searchParams.get('from') ?? addDays(t, -364);
        const to = url.searchParams.get('to') ?? t;
        return dateRange(from, to).map((date) => ({ date, ...dayCounts(habitsNow, date) }));
      }
      case 'trend': {
        const days = Number(url.searchParams.get('days') ?? 30);
        return dateRange(addDays(t, -(days - 1)), t).map((date) => {
          const c = dayCounts(habitsNow, date);
          return { date, rate: rate(c.count, c.total) };
        });
      }
      case 'weekday': {
        const acc = Array.from({ length: 7 }, () => ({ count: 0, total: 0 }));
        for (const date of dateRange(addDays(t, -89), t)) {
          const c = dayCounts(habitsNow, date);
          const w = (jsWeekday(date) + 6) % 7;
          acc[w].count += c.count;
          acc[w].total += c.total;
        }
        return acc.map((a, i) => ({ weekday: i, rate: rate(a.count, a.total) }));
      }
    }
  }
  throw new ApiError('NOT_FOUND', `Route ${method} ${url.pathname} not found`, 404);
}
