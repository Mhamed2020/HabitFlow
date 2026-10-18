import { all, get, type Db } from './db.js';
import { today } from './dates.js';
import { computeLast7, computeStreaks } from './streaks.js';

export interface Habit {
  id: number;
  name: string;
  color: string;
  frequency: number[];
  createdAt: string;
  archived: boolean;
  currentStreak: number;
  bestStreak: number;
  last7: boolean[];
}

export interface HabitRow {
  id: number;
  name: string;
  color: string;
  frequency: string;
  created_at: string;
  archived: number;
}

export async function checkinsByHabit(db: Db, habitIds?: number[]): Promise<Map<number, Set<string>>> {
  const rows = await all<{ habit_id: number; date: string }>(db, 'SELECT habit_id, date FROM checkins');
  const map = new Map<number, Set<string>>();
  const wanted = habitIds ? new Set(habitIds) : null;
  for (const r of rows) {
    if (wanted && !wanted.has(r.habit_id)) continue;
    let s = map.get(r.habit_id);
    if (!s) map.set(r.habit_id, (s = new Set()));
    s.add(r.date);
  }
  return map;
}

export function toHabit(row: HabitRow, checked: Set<string>, todayStr = today()): Habit {
  const frequency = JSON.parse(row.frequency) as number[];
  const { currentStreak, bestStreak } = computeStreaks(frequency, checked, todayStr);
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    frequency,
    createdAt: row.created_at,
    archived: row.archived === 1,
    currentStreak,
    bestStreak,
    last7: computeLast7(checked, todayStr),
  };
}

export function getHabitRow(db: Db, id: number): Promise<HabitRow | undefined> {
  return get<HabitRow>(db, 'SELECT * FROM habits WHERE id = ?', [id]);
}

export async function loadHabit(db: Db, id: number): Promise<Habit | undefined> {
  const row = await getHabitRow(db, id);
  if (!row) return undefined;
  const checked = (await checkinsByHabit(db, [id])).get(id) ?? new Set<string>();
  return toHabit(row, checked);
}

export async function listHabits(db: Db, includeArchived = false): Promise<Habit[]> {
  const rows = await all<HabitRow>(
    db,
    `SELECT * FROM habits ${includeArchived ? '' : 'WHERE archived = 0'} ORDER BY id`,
  );
  const checks = await checkinsByHabit(db);
  const t = today();
  return rows.map((r) => toHabit(r, checks.get(r.id) ?? new Set(), t));
}
