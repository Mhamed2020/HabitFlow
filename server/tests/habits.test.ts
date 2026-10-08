import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pinToday, setup, TODAY } from "./helpers.js";

beforeEach(() => pinToday());
afterEach(() => vi.useRealTimers());

describe('habits routes', () => {
  it('creates a habit with defaults (201) and lists it', async () => {
    const { api } = setup();
    const res = await api().post('/api/habits').send({ name: 'Read' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      name: 'Read',
      frequency: [],
      createdAt: TODAY,
      currentStreak: 0,
      bestStreak: 0,
      last7: [false, false, false, false, false, false, false],
    });
    const list = await api().get('/api/habits');
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
  });

  it('rejects an empty name with the VALIDATION_ERROR format', async () => {
    const { api } = setup();
    const res = await api().post('/api/habits').send({ name: '  ' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(typeof res.body.error.message).toBe('string');
  });

  it.each([
    [{ name: 'x', color: 'red' }],
    [{ name: 'x', frequency: [7] }],
    [{ name: 'x', frequency: [1, 1] }],
    [{}],
  ])('rejects invalid body %j', async (body) => {
    const { api } = setup();
    const res = await api().post('/api/habits').send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns VALIDATION_ERROR for malformed JSON', async () => {
    const { api } = setup();
    const res = await api().post('/api/habits').set('Content-Type', 'application/json').send('{bad');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('PATCH updates fields and returns the habit', async () => {
    const { api } = setup();
    const { body: h } = await api().post('/api/habits').send({ name: 'A' });
    const res = await api().patch(`/api/habits/${h.id}`).send({ name: 'B', frequency: [3, 1], color: '#ff0000' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: 'B', frequency: [1, 3], color: '#ff0000' });
  });

  it('PATCH with no fields or invalid fields is a 400', async () => {
    const { api } = setup();
    const { body: h } = await api().post('/api/habits').send({ name: 'A' });
    expect((await api().patch(`/api/habits/${h.id}`).send({})).status).toBe(400);
    const res = await api().patch(`/api/habits/${h.id}`).send({ name: '' });
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 NOT_FOUND for unknown or non-numeric ids', async () => {
    const { api } = setup();
    for (const res of [
      await api().patch('/api/habits/999').send({ name: 'x' }),
      await api().delete('/api/habits/999'),
      await api().patch('/api/habits/abc').send({ name: 'x' }),
    ]) {
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    }
  });

  it('returns 404 NOT_FOUND for unknown routes', async () => {
    const { api } = setup();
    const res = await api().get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('DELETE archives: 204 and the habit is no longer listed', async () => {
    const { api } = setup();
    const { body: h } = await api().post('/api/habits').send({ name: 'A' });
    await api().post('/api/habits').send({ name: 'B' });
    const del = await api().delete(`/api/habits/${h.id}`);
    expect(del.status).toBe(204);
    const list = await api().get('/api/habits');
    expect(list.body.map((x: { name: string }) => x.name)).toEqual(['B']);
  });
});

describe('archived habits', () => {
  it('check-in POST/DELETE on an archived habit is 404 NOT_FOUND', async () => {
    const { api } = setup();
    const { body: h } = await api().post('/api/habits').send({ name: 'A' });
    await api().delete(`/api/habits/${h.id}`);
    const post = await api().post(`/api/habits/${h.id}/checkins`).send({ date: TODAY });
    expect(post.status).toBe(404);
    expect(post.body.error.code).toBe('NOT_FOUND');
    expect((await api().delete(`/api/habits/${h.id}/checkins/${TODAY}`)).status).toBe(404);
  });
});
