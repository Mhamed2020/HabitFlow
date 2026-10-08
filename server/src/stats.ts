import type { Db } from './db.js';
import { addDays, dateRange, mondayWeekday, today } from './dates.js';
import { checkinsByHabit, listHabits } from './habits.js';
import { isScheduled } from './streaks.js';

interface Ctx {
  habits: { id: number; frequency: number[]; createdAt: string; bestStreak: number }[];
  checks: Map<number, Set<string>>;
}

function loadCtx(db: Db): Ctx {
  const habits = listHabits(db);
  const checks = checkinsByHabit(db, habits.map((h) => h.id));
  return { habits, checks };
}

/** count = checked scheduled habits, total = scheduled habits that day. */
function dayCounts(ctx: Ctx, date: string): { count: number; total: number } {
  let count = 0;
  let total = 0;
  for (const h of ctx.habits) {
    if (!isScheduled(h.frequency, date)) continue;
    const checked = ctx.checks.get(h.id)?.has(date) ?? false;
    // A habit is not expected before it existed (unless it was checked anyway).
    if (date < h.createdAt && !checked) continue;
    total++;
    if (checked) count++;
  }
  return { count, total };
}

const rate = (count: number, total: number) => (total === 0 ? 0 : count / total);

export function heatmap(db: Db, from: string, to: string) {
  const ctx = loadCtx(db);
  return dateRange(from, to).map((date) => ({ date, ...dayCounts(ctx, date) }));
}

export function trend(db: Db, days: number) {
  const ctx = loadCtx(db);
  const t = today();
  return dateRange(addDays(t, -(days - 1)), t).map((date) => {
    const { count, total } = dayCounts(ctx, date);
    return { date, rate: rate(count, total) };
  });
}

/** Aggregated over the last 90 days. 0 = Monday ... 6 = Sunday. */
export function weekday(db: Db) {
  const ctx = loadCtx(db);
  const t = today();
  const acc = Array.from({ length: 7 }, () => ({ count: 0, total: 0 }));
  for (const date of dateRange(addDays(t, -89), t)) {
    const { count, total } = dayCounts(ctx, date);
    const w = mondayWeekday(date);
    acc[w].count += count;
    acc[w].total += total;
  }
  return acc.map((a, i) => ({ weekday: i, rate: rate(a.count, a.total) }));
}

export function summary(db: Db) {
  const ctx = loadCtx(db);
  const t = today();
  const todayC = dayCounts(ctx, t);
  let count = 0;
  let total = 0;
  for (const date of dateRange(addDays(t, -29), t)) {
    const c = dayCounts(ctx, date);
    count += c.count;
    total += c.total;
  }
  return {
    activeHabits: ctx.habits.length,
    todayRate: rate(todayC.count, todayC.total),
    bestStreak: ctx.habits.reduce((m, h) => Math.max(m, h.bestStreak), 0),
    rate30d: rate(count, total),
  };
}
