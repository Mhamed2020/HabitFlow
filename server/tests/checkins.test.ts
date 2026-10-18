import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { check, insertHabit, pinToday, setup, TODAY } from './helpers.js';

// TODAY = Wed 2026-03-18. Previous days: 17 Tue, 16 Mon, 15 Sun, 14 Sat, 13 Fri, 12 Thu, 11 Wed.
beforeEach(() => pinToday());
afterEach(() => vi.useRealTimers());

const get = async (api: Awaited<ReturnType<typeof setup>>['api'], id: number) =>
  (await api().get('/api/habits')).body.find((h: { id: number }) => h.id === id);

describe('check-in routes', () => {
  it('POST is idempotent: twice -> 201 both times, still one check-in', async () => {
    const { api, db } = await setup();
    const id = await insertHabit(db);
    const a = await api().post(`/api/habits/${id}/checkins`).send({ date: TODAY });
    const b = await api().post(`/api/habits/${id}/checkins`).send({ date: TODAY });
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    expect((await db.execute('SELECT COUNT(*) c FROM checkins')).rows[0].c).toBe(1);
    expect(b.body.currentStreak).toBe(1);
  });

  it('DELETE removes the check-in (204) and is harmless when absent', async () => {
    const { api, db } = await setup();
    const id = await insertHabit(db);
    await check(db, id, TODAY);
    expect((await api().delete(`/api/habits/${id}/checkins/${TODAY}`)).status).toBe(204);
    expect((await get(api, id)).currentStreak).toBe(0);
    expect((await api().delete(`/api/habits/${id}/checkins/${TODAY}`)).status).toBe(204);
  });

  it('validates date and habit id', async () => {
    const { api, db } = await setup();
    const id = await insertHabit(db);
    for (const date of ['2026-02-30', 'nope', '2099-01-01']) {
      const r = await api().post(`/api/habits/${id}/checkins`).send({ date });
      expect(r.status).toBe(400);
      expect(r.body.error.code).toBe('VALIDATION_ERROR');
    }
    expect((await api().post(`/api/habits/${id}/checkins`).send({})).status).toBe(400);
    expect((await api().delete(`/api/habits/${id}/checkins/bad`)).status).toBe(400);
    const nf = await api().post('/api/habits/999/checkins').send({ date: TODAY });
    expect(nf.status).toBe(404);
    expect(nf.body.error.code).toBe('NOT_FOUND');
  });
});

describe('streaks', () => {
  it('counts consecutive days for an every-day habit', async () => {
    const { api, db } = await setup();
    const id = await insertHabit(db);
    await check(db, id, '2026-03-16', '2026-03-17', TODAY);
    const h = await get(api, id);
    expect(h.currentStreak).toBe(3);
    expect(h.bestStreak).toBe(3);
  });

  it('frequency=[] means every day: a missed day breaks the streak', async () => {
    const { api, db } = await setup();
    const id = await insertHabit(db, { frequency: [] });
    await check(db, id, '2026-03-15', '2026-03-17', TODAY); // 16 missed
    expect((await get(api, id)).currentStreak).toBe(2);
  });

  it('today unchecked does not break the current streak', async () => {
    const { api, db } = await setup();
    const id = await insertHabit(db);
    await check(db, id, '2026-03-16', '2026-03-17');
    const h = await get(api, id);
    expect(h.currentStreak).toBe(2);
    expect(h.last7[6]).toBe(false);
  });

  it('a missed scheduled day (yesterday) breaks the current streak', async () => {
    const { api, db } = await setup();
    const id = await insertHabit(db);
    await check(db, id, '2026-03-15', '2026-03-16'); // 17 and today missing
    const h = await get(api, id);
    expect(h.currentStreak).toBe(0);
    expect(h.bestStreak).toBe(2);
  });

  it('unscheduled days never break a streak', async () => {
    const { api, db } = await setup();
    // Mon(1) and Wed(3) only: Mon 16 -> Wed 18 spans unscheduled Tue 17.
    const id = await insertHabit(db, { frequency: [1, 3] });
    await check(db, id, '2026-03-11', '2026-03-16', TODAY); // Wed 11, Mon 16, Wed 18
    expect((await get(api, id)).currentStreak).toBe(3);
    const id2 = await insertHabit(db, { frequency: [1, 3] });
    await check(db, id2, '2026-03-16'); // Mon; today (Wed) unchecked
    expect((await get(api, id2)).currentStreak).toBe(1);
  });

  it('bestStreak can exceed currentStreak', async () => {
    const { api, db } = await setup();
    const id = await insertHabit(db);
    await check(db, id, '2026-03-08', '2026-03-09', '2026-03-10', '2026-03-11', '2026-03-12', '2026-03-17', TODAY);
    const h = await get(api, id);
    expect(h.currentStreak).toBe(2);
    expect(h.bestStreak).toBe(5);
  });

  it('last7 has 7 entries ordered oldest -> today', async () => {
    const { api, db } = await setup();
    const id = await insertHabit(db);
    await check(db, id, '2026-03-12', TODAY);
    const h = await get(api, id);
    expect(h.last7).toEqual([true, false, false, false, false, false, true]);
  });
});
