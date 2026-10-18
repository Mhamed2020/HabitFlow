import { act, render, screen } from '@testing-library/react';
import { handleDemo, resetDemo } from './demo';
import type { Habit, Summary } from '../types/api';

// client.ts reads import.meta.env at module load: re-import it after stubbing env.
async function loadClient(env: Record<string, string>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  return import('./client');
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  resetDemo();
});

describe('demo data (handleDemo)', () => {
  it('serves the seeded habits and consistent stats', () => {
    const habits = handleDemo('GET', '/api/habits') as Habit[];
    expect(habits.map((h) => h.name)).toEqual([
      'Meditation',
      'Workout',
      'Reading',
      'Drink 2L of water',
      'Weekly review',
    ]);
    for (const h of habits) expect(h.last7).toHaveLength(7);

    const s = handleDemo('GET', '/api/stats/summary') as Summary;
    expect(s.activeHabits).toBe(5);
    expect(s.rate30d).toBeGreaterThan(0);
    expect(s.rate30d).toBeLessThanOrEqual(1);
    expect(handleDemo('GET', '/api/stats/trend?days=7')).toHaveLength(7);
    expect(handleDemo('GET', '/api/stats/weekday')).toHaveLength(7);
  });

  it('supports create, check-in, archive and restore in memory', () => {
    const created = handleDemo('POST', '/api/habits', { name: '  Stretch ', frequency: [3, 1] }) as Habit;
    expect(created).toMatchObject({ id: 6, name: 'Stretch', frequency: [1, 3], currentStreak: 0 });

    const today = created.createdAt;
    const checked = handleDemo('POST', `/api/habits/6/checkins`, { date: today }) as Habit;
    expect(checked.last7[6]).toBe(true);

    handleDemo('DELETE', '/api/habits/6');
    expect((handleDemo('GET', '/api/habits') as Habit[]).some((h) => h.id === 6)).toBe(false);
    expect(() => handleDemo('POST', '/api/habits/6/checkins', { date: today })).toThrow('Habit not found');

    const restored = handleDemo('PATCH', '/api/habits/6', { archived: false }) as Habit;
    expect(restored.archived).toBe(false);
    expect((handleDemo('GET', '/api/habits') as Habit[]).some((h) => h.id === 6)).toBe(true);
  });
});

describe('request() fallback', () => {
  it('without VITE_DEMO_FALLBACK, a network error is reported as NETWORK', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const api = await loadClient({ VITE_API_URL: 'https://api.example' });
    await expect(api.listHabits()).rejects.toMatchObject({ code: 'NETWORK' });
    expect(api.getApiMode()).toBe('live');
  });

  it('calls the configured API origin', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('[]', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const api = await loadClient({ VITE_API_URL: 'https://api.example/', VITE_DEMO_FALLBACK: 'true' });
    await expect(api.listHabits()).resolves.toEqual([]);
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.example/api/habits');
    expect(api.getApiMode()).toBe('live');
  });

  it('switches to demo data when the API is unreachable, then detects the server waking up', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetchMock);
    const api = await loadClient({ VITE_API_URL: 'https://api.example', VITE_DEMO_FALLBACK: 'true' });

    const habits = await api.listHabits();
    expect(habits).toHaveLength(5);
    expect(api.getApiMode()).toBe('demo');

    fetchMock.mockResolvedValue(new Response('{"status":"ok"}', { status: 200 }));
    await vi.advanceTimersByTimeAsync(15000);
    expect(fetchMock).toHaveBeenLastCalledWith('https://api.example/api/health');
    expect(api.getApiMode()).toBe('demo-server-ready');
  });

  it('starts in demo mode when no API origin is configured', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const api = await loadClient({ VITE_DEMO_FALLBACK: 'true' });
    expect(api.getApiMode()).toBe('demo');
    await expect(api.getSummary()).resolves.toMatchObject({ activeHabits: 5 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('DemoBanner', () => {
  it('is hidden in live mode and explains demo mode otherwise', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const api = await loadClient({ VITE_API_URL: 'https://api.example', VITE_DEMO_FALLBACK: 'true' });
    const { default: DemoBanner } = await import('../components/DemoBanner');

    render(<DemoBanner />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    await act(() => api.listHabits());
    expect(screen.getByRole('status')).toHaveTextContent('Demo mode');
  });
});
