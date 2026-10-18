import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { InStatement } from '@libsql/client';
import { createDb, dbConfig, run } from './db.js';
import { addDays, jsWeekday, today } from './dates.js';
import { isScheduled } from './streaks.js';

const dir = path.dirname(fileURLToPath(import.meta.url));
// Seeds the local file by default, or the database in DATABASE_URL (e.g. Turso).
const { url, authToken } = dbConfig(path.resolve(dir, '../data/habitflow.db'));
const db = await createDb(url, authToken);

// Deterministic PRNG so the seed is reproducible.
let s = 42;
const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);

const habits = [
  { name: 'Meditation', color: '#8b5cf6', frequency: [] as number[], rate: 0.85 },
  { name: 'Workout', color: '#ef4444', frequency: [1, 3, 5], rate: 0.8 },
  { name: 'Reading', color: '#3b82f6', frequency: [] as number[], rate: 0.65 },
  { name: 'Drink 2L of water', color: '#06b6d4', frequency: [] as number[], rate: 0.75 },
  { name: 'Weekly review', color: '#f59e0b', frequency: [0], rate: 0.9 },
];

const t = today();
const start = addDays(t, -89);

// Reset in place (the API server may hold the file open; deleting it fails on Windows).
await db.batch(
  ['DELETE FROM checkins', 'DELETE FROM habits', "DELETE FROM sqlite_sequence WHERE name IN ('habits','checkins')"],
  'write',
);

const checkins: InStatement[] = [];
for (const h of habits) {
  const id = await run(db, 'INSERT INTO habits (name, color, frequency, created_at) VALUES (?, ?, ?, ?)', [
    h.name,
    h.color,
    JSON.stringify(h.frequency),
    start,
  ]);
  for (let i = 0; i < 90; i++) {
    const date = addDays(start, i);
    if (!isScheduled(h.frequency, date)) continue;
    // Slightly lower completion on weekends, improving over time; today is left open.
    const wd = jsWeekday(date);
    const weekend = wd === 0 || wd === 6 ? -0.1 : 0;
    const trendBoost = (i / 90) * 0.1 - 0.05;
    if (date !== t && rand() < h.rate + weekend + trendBoost) {
      checkins.push({ sql: 'INSERT OR IGNORE INTO checkins (habit_id, date) VALUES (?, ?)', args: [id, date] });
    }
  }
}
// One round trip for all check-ins (matters for a remote database).
await db.batch(checkins, 'write');

console.log(`Seeded ${habits.length} habits x 90 days into ${url.startsWith('file:') ? url : 'DATABASE_URL'}`);
db.close();
