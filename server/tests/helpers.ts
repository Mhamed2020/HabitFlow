import { vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createDb, type Db } from '../src/db.js';

/** Pinned "today": Wednesday 2026-03-18 (JS getDay() === 3). */
export const TODAY = '2026-03-18';

export function pinToday(date = TODAY) {
  const [y, m, d] = date.split('-').map(Number);
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(y, m - 1, d, 12));
}

export function setup() {
  const db: Db = createDb(':memory:');
  const app = createApp(db);
  return { db, app, api: () => request(app) };
}

export function insertHabit(
  db: Db,
  o: { name?: string; frequency?: number[]; createdAt?: string; archived?: boolean } = {},
): number {
  const info = db
    .prepare('INSERT INTO habits (name, color, frequency, created_at, archived) VALUES (?, ?, ?, ?, ?)')
    .run(o.name ?? 'Habit', '#6366f1', JSON.stringify(o.frequency ?? []), o.createdAt ?? '2025-01-01', o.archived ? 1 : 0);
  return Number(info.lastInsertRowid);
}

export function check(db: Db, habitId: number, ...dates: string[]) {
  const st = db.prepare('INSERT OR IGNORE INTO checkins (habit_id, date) VALUES (?, ?)');
  for (const d of dates) st.run(habitId, d);
}
