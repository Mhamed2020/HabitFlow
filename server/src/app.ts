import express from 'express';
import { z } from 'zod';
import type { Db } from './db.js';
import { errorHandler, notFound, notFoundHandler, validation } from './errors.js';
import { getHabitRow, listHabits, loadHabit } from './habits.js';
import { addDays, isValidDate, parseDate, today } from './dates.js';
import * as stats from './stats.js';

const dateStr = z.string().refine(isValidDate, 'must be a valid date YYYY-MM-DD');

const habitFields = {
  name: z.string().trim().min(1, 'name is required').max(60),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'must be a #RRGGBB color'),
  frequency: z
    .array(z.number().int().min(0).max(6))
    .max(7)
    .refine((a) => new Set(a).size === a.length, 'must not contain duplicates'),
};

const createSchema = z.object({
  name: habitFields.name,
  color: habitFields.color.default('#6366f1'),
  frequency: habitFields.frequency.default([]),
});

const patchSchema = z
  .object({
    name: habitFields.name,
    color: habitFields.color,
    frequency: habitFields.frequency,
    archived: z.boolean(),
  })
  .partial()
  .refine((o) => Object.keys(o).length > 0, 'at least one field is required');

function parseId(raw: string): number {
  if (!/^\d+$/.test(raw)) throw notFound('Habit');
  return Number(raw);
}

const sortedJson = (a: number[]) => JSON.stringify([...a].sort((x, y) => x - y));

export function createApp(db: Db) {
  const app = express();
  app.use(express.json());

  const requireHabit = (raw: string, activeOnly = false) => {
    const id = parseId(raw);
    const row = getHabitRow(db, id);
    if (!row || (activeOnly && row.archived === 1)) throw notFound('Habit');
    return id;
  };

  // ---- habits
  app.get('/api/habits', (_req, res) => {
    res.json(listHabits(db));
  });

  app.post('/api/habits', (req, res) => {
    const b = createSchema.parse(req.body);
    const info = db
      .prepare('INSERT INTO habits (name, color, frequency, created_at) VALUES (?, ?, ?, ?)')
      .run(b.name, b.color, sortedJson(b.frequency), today());
    res.status(201).json(loadHabit(db, Number(info.lastInsertRowid)));
  });

  app.patch('/api/habits/:id', (req, res) => {
    const id = requireHabit(req.params.id);
    const b = patchSchema.parse(req.body);
    const sets: string[] = [];
    const vals: (string | number)[] = [];
    if (b.name !== undefined) {
      sets.push('name = ?');
      vals.push(b.name);
    }
    if (b.color !== undefined) {
      sets.push('color = ?');
      vals.push(b.color);
    }
    if (b.frequency !== undefined) {
      sets.push('frequency = ?');
      vals.push(sortedJson(b.frequency));
    }
    if (b.archived !== undefined) {
      sets.push('archived = ?');
      vals.push(b.archived ? 1 : 0);
    }
    db.prepare(`UPDATE habits SET ${sets.join(', ')} WHERE id = ?`).run(...vals, id);
    res.json(loadHabit(db, id));
  });

  app.delete('/api/habits/:id', (req, res) => {
    const id = requireHabit(req.params.id);
    db.prepare('UPDATE habits SET archived = 1 WHERE id = ?').run(id);
    res.status(204).end();
  });

  // ---- checkins
  app.post('/api/habits/:id/checkins', (req, res) => {
    const id = requireHabit(req.params.id, true);
    const { date } = z.object({ date: dateStr }).parse(req.body);
    if (date > today()) throw validation('date: cannot check in on a future date');
    db.prepare('INSERT OR IGNORE INTO checkins (habit_id, date) VALUES (?, ?)').run(id, date);
    res.status(201).json(loadHabit(db, id));
  });

  app.delete('/api/habits/:id/checkins/:date', (req, res) => {
    const id = requireHabit(req.params.id, true);
    if (!isValidDate(req.params.date)) throw validation('date: must be a valid date YYYY-MM-DD');
    db.prepare('DELETE FROM checkins WHERE habit_id = ? AND date = ?').run(id, req.params.date);
    res.status(204).end();
  });

  // ---- stats
  app.get('/api/stats/summary', (_req, res) => {
    res.json(stats.summary(db));
  });

  app.get('/api/stats/heatmap', (req, res) => {
    const t = today();
    const q = z
      .object({ from: dateStr.default(addDays(t, -364)), to: dateStr.default(t) })
      .refine((o) => o.from <= o.to, 'from must be <= to')
      .refine((o) => parseDate(o.to).getTime() - parseDate(o.from).getTime() <= 800 * 86400000, 'range too large')
      .parse(req.query);
    res.json(stats.heatmap(db, q.from, q.to));
  });

  app.get('/api/stats/trend', (req, res) => {
    const q = z.object({ days: z.coerce.number().int().min(1).max(366).default(30) }).parse(req.query);
    res.json(stats.trend(db, q.days));
  });

  app.get('/api/stats/weekday', (_req, res) => {
    res.json(stats.weekday(db));
  });

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
