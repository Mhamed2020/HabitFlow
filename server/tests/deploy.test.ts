import { describe, expect, it } from 'vitest';
import { setup } from './helpers.js';

const PAGES = 'https://mhamed2020.github.io';

describe('GET /api/health', () => {
  it('returns 200 { status: ok } when the database answers', async () => {
    const { api } = await setup();
    const res = await api().get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('CORS', () => {
  it('allows a configured origin, including the preflight request', async () => {
    const { api } = await setup([PAGES]);
    const pre = await api()
      .options('/api/habits')
      .set('Origin', PAGES)
      .set('Access-Control-Request-Method', 'POST');
    expect(pre.status).toBe(204);
    expect(pre.headers['access-control-allow-origin']).toBe(PAGES);
    expect(pre.headers['access-control-allow-methods']).toContain('PATCH');
    expect(pre.headers['access-control-allow-headers']).toContain('Content-Type');

    const res = await api().get('/api/habits').set('Origin', PAGES);
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe(PAGES);
  });

  it('sends no CORS headers to other origins or when none are configured', async () => {
    const { api } = await setup([PAGES]);
    const other = await api().get('/api/habits').set('Origin', 'https://evil.example');
    expect(other.headers['access-control-allow-origin']).toBeUndefined();

    const { api: closed } = await setup();
    const res = await closed().get('/api/habits').set('Origin', PAGES);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
