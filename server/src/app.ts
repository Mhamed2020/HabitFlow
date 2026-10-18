import express, { type RequestHandler } from 'express';
import { z } from 'zod';
import { run, type Db } from './db.js';
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

/** Express 4 does not catch rejected promises: forward them to the error handler. */
const wrap =
  (fn: (...args: Parameters<RequestHandler>) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

/**
 * Allow cross-origin calls from the hosted frontend (e.g. GitHub Pages).
 * `allowedOrigins` comes from CORS_ORIGIN (comma-separated); empty = same-origin only.
 */
function cors(allowedOrigins: string[]): RequestHandler {
  return (req, res, next) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Access-Control-Max-Age', '86400');
    }
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  };
}

/** `frontendUrl` (FRONTEND_URL): where a visit to the API root is redirected, e.g. the GitHub Pages site. */
export function createApp(db: Db, allowedOrigins: string[] = [], frontendUrl?: string) {
  const app = express();
  app.use(cors(allowedOrigins));
  app.use(express.json());

  // People who open the API's own URL in a browser land on the app instead of a 404.
  if (frontendUrl) {
    app.get('/', (_req, res) => {
      res.redirect(302, frontendUrl);
    });
  }

  const requireHabit = async (raw: string, activeOnly = false) => {
    const id = parseId(raw);
    const row = await getHabitRow(db, id);
    if (!row || (activeOnly && row.archived === 1)) throw notFound('Habit');
    return id;
  };

  // ---- health (used by the host's health check and post-deploy smoke tests)
  app.get(
    '/api/health',
    wrap(async (_req, res) => {
      await db.execute('SELECT 1');
      res.json({ status: 'ok' });
    }),
  );

  // ---- habits
  app.get(
    '/api/habits',
    wrap(async (_req, res) => {
      res.json(await listHabits(db));
    }),
  );

  app.post(
    '/api/habits',
    wrap(async (req, res) => {
      const b = createSchema.parse(req.body);
      const id = await run(db, 'INSERT INTO habits (name, color, frequency, created_at) VALUES (?, ?, ?, ?)', [
        b.name,
        b.color,
        sortedJson(b.frequency),
        today(),
      ]);
      res.status(201).json(await loadHabit(db, id));
    }),
  );

  app.patch(
    '/api/habits/:id',
    wrap(async (req, res) => {
      const id = await requireHabit(req.params.id);
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
      await run(db, `UPDATE habits SET ${sets.join(', ')} WHERE id = ?`, [...vals, id]);
      res.json(await loadHabit(db, id));
    }),
  );

  app.delete(
    '/api/habits/:id',
    wrap(async (req, res) => {
      const id = await requireHabit(req.params.id);
      await run(db, 'UPDATE habits SET archived = 1 WHERE id = ?', [id]);
      res.status(204).end();
    }),
  );

  // ---- checkins
  app.post(
    '/api/habits/:id/checkins',
    wrap(async (req, res) => {
      const id = await requireHabit(req.params.id, true);
      const { date } = z.object({ date: dateStr }).parse(req.body);
      if (date > today()) throw validation('date: cannot check in on a future date');
      await run(db, 'INSERT OR IGNORE INTO checkins (habit_id, date) VALUES (?, ?)', [id, date]);
      res.status(201).json(await loadHabit(db, id));
    }),
  );

  app.delete(
    '/api/habits/:id/checkins/:date',
    wrap(async (req, res) => {
      const id = await requireHabit(req.params.id, true);
      if (!isValidDate(req.params.date)) throw validation('date: must be a valid date YYYY-MM-DD');
      await run(db, 'DELETE FROM checkins WHERE habit_id = ? AND date = ?', [id, req.params.date]);
      res.status(204).end();
    }),
  );

  // ---- stats
  app.get(
    '/api/stats/summary',
    wrap(async (_req, res) => {
      res.json(await stats.summary(db));
    }),
  );

  app.get(
    '/api/stats/heatmap',
    wrap(async (req, res) => {
      const t = today();
      const q = z
        .object({ from: dateStr.default(addDays(t, -364)), to: dateStr.default(t) })
        .refine((o) => o.from <= o.to, 'from must be <= to')
        .refine((o) => parseDate(o.to).getTime() - parseDate(o.from).getTime() <= 800 * 86400000, 'range too large')
        .parse(req.query);
      res.json(await stats.heatmap(db, q.from, q.to));
    }),
  );

  app.get(
    '/api/stats/trend',
    wrap(async (req, res) => {
      const q = z.object({ days: z.coerce.number().int().min(1).max(366).default(30) }).parse(req.query);
      res.json(await stats.trend(db, q.days));
    }),
  );

  app.get(
    '/api/stats/weekday',
    wrap(async (_req, res) => {
      res.json(await stats.weekday(db));
    }),
  );

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
