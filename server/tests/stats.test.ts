import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { check, insertHabit, pinToday, setup, TODAY } from './helpers.js';

// TODAY = Wed 2026-03-18
beforeEach(() => pinToday());
afterEach(() => vi.useRealTimers());

describe('GET /api/stats/summary', () => {
  it('returns zeros (no NaN) with no habits', async () => {
    const { api } = await setup();
    const res = await api().get('/api/stats/summary');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ activeHabits: 0, todayRate: 0, bestStreak: 0, rate30d: 0 });
  });

  it('todayRate only counts habits scheduled today', async () => {
    const { api, db } = await setup();
    const a = await insertHabit(db);
    await insertHabit(db);
    await insertHabit(db, { frequency: [0] }); // Sunday only: not scheduled on Wed
    await check(db, a, TODAY);
    const res = await api().get('/api/stats/summary');
    expect(res.body.activeHabits).toBe(3);
    expect(res.body.todayRate).toBeCloseTo(0.5);
  });

  it('ignores archived habits and reports best streak', async () => {
    const { api, db } = await setup();
    const a = await insertHabit(db);
    const arch = await insertHabit(db, { archived: true });
    await check(db, a, '2026-03-16', '2026-03-17', TODAY);
    await check(db, arch, '2026-03-01', '2026-03-02', '2026-03-03', '2026-03-04');
    const res = await api().get('/api/stats/summary');
    expect(res.body.activeHabits).toBe(1);
    expect(res.body.bestStreak).toBe(3);
    expect(res.body.rate30d).toBeCloseTo(3 / 30);
  });
});

describe('GET /api/stats/heatmap', () => {
  it('returns count/total per day for the range', async () => {
    const { api, db } = await setup();
    const a = await insertHabit(db);
    await insertHabit(db);
    await insertHabit(db, { frequency: [3] }); // Wednesdays only
    await check(db, a, '2026-03-17', TODAY);
    const res = await api().get('/api/stats/heatmap?from=2026-03-17&to=2026-03-18');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { date: '2026-03-17', count: 1, total: 2 },
      { date: '2026-03-18', count: 1, total: 3 },
    ]);
  });

  it('validates from/to', async () => {
    const { api } = await setup();
    for (const q of ['from=bad&to=2026-03-18', 'from=2026-03-18&to=2026-03-01']) {
      const res = await api().get(`/api/stats/heatmap?${q}`);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('defaults to the last 365 days ending today', async () => {
    const { api } = await setup();
    const res = await api().get('/api/stats/heatmap');
    expect(res.body).toHaveLength(365);
    expect(res.body.at(-1).date).toBe(TODAY);
  });
});

describe('GET /api/stats/trend', () => {
  it('returns `days` entries ending today with rates in [0,1]', async () => {
    const { api, db } = await setup();
    const a = await insertHabit(db);
    await insertHabit(db);
    await check(db, a, TODAY, '2026-03-17');
    const res = await api().get('/api/stats/trend?days=10');
    expect(res.body).toHaveLength(10);
    expect(res.body.at(-1)).toEqual({ date: TODAY, rate: 0.5 });
    expect(res.body[0].date).toBe('2026-03-09');
    for (const p of res.body) {
      expect(p.rate).toBeGreaterThanOrEqual(0);
      expect(p.rate).toBeLessThanOrEqual(1);
    }
  });

  it('defaults to 30 days and rejects invalid days', async () => {
    const { api } = await setup();
    expect((await api().get('/api/stats/trend')).body).toHaveLength(30);
    expect((await api().get('/api/stats/trend?days=0')).status).toBe(400);
    expect((await api().get('/api/stats/trend?days=abc')).status).toBe(400);
  });
});

describe('GET /api/stats/weekday', () => {
  it('returns 7 entries, 0 = Monday ... 6 = Sunday', async () => {
    const { api, db } = await setup();
    const a = await insertHabit(db);
    await check(db, a, '2026-03-16', '2026-03-15'); // Mon (0) and Sun (6)
    const res = await api().get('/api/stats/weekday');
    expect(res.body.map((x: { weekday: number }) => x.weekday)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    const rates = res.body.map((x: { rate: number }) => x.rate);
    expect(rates[0]).toBeGreaterThan(0);
    expect(rates[6]).toBeGreaterThan(0);
    expect(rates[1]).toBe(0);
    for (const r of rates) expect(r).toBeLessThanOrEqual(1);
  });
});
