import {
  ApiError,
  type ApiErrorBody,
  type Habit,
  type HabitInput,
  type HabitPatch,
  type HeatmapEntry,
  type Summary,
  type TrendPoint,
  type WeekdayRate,
} from '../types/api';
import { handleDemo } from './demo';
import { API_BASE, DEMO_FALLBACK, getApiMode, setApiMode } from './mode';

export { getApiMode, subscribeApiMode, type ApiMode } from './mode';

/** A sleeping free-tier backend can take ~1 min to wake up: switch to demo data well before that. */
const FALLBACK_TIMEOUT_MS = 8000;
const HEALTH_POLL_MS = 15000;

/** While on demo data, poll the real API and tell the UI once it answers. */
function watchForServer() {
  if (!API_BASE) return;
  const timer = setInterval(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/health`);
      if (res.ok) {
        clearInterval(timer);
        setApiMode('demo-server-ready');
      }
    } catch {
      /* still asleep */
    }
  }, HEALTH_POLL_MS);
}

function enterDemo() {
  if (getApiMode() !== 'live') return;
  setApiMode('demo');
  watchForServer();
}

async function demoRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
  const result = handleDemo(init?.method ?? 'GET', path, body);
  // Copy, so callers never share objects with the demo store.
  return (result === undefined ? undefined : JSON.parse(JSON.stringify(result))) as T;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (getApiMode() !== 'live') return demoRequest<T>(path, init);
  let res: Response;
  const abort = new AbortController();
  const timer = DEMO_FALLBACK ? setTimeout(() => abort.abort(), FALLBACK_TIMEOUT_MS) : undefined;
  try {
    res = await fetch(API_BASE + path, {
      ...init,
      signal: abort.signal,
      headers: init?.body ? { 'Content-Type': 'application/json', ...init.headers } : init?.headers,
    });
  } catch {
    if (DEMO_FALLBACK) {
      enterDemo();
      return demoRequest<T>(path, init);
    }
    throw new ApiError('NETWORK', 'Network error: could not reach the server');
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    let body: Partial<ApiErrorBody> | null = null;
    try {
      body = (await res.json()) as Partial<ApiErrorBody>;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(
      body?.error?.code ?? 'INTERNAL',
      body?.error?.message ?? `Request failed (${res.status})`,
      res.status,
    );
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });

export const listHabits = () => request<Habit[]>('/api/habits');
export const createHabit = (input: HabitInput) => request<Habit>('/api/habits', json('POST', input));
export const updateHabit = (id: number, patch: HabitPatch) =>
  request<Habit>(`/api/habits/${id}`, json('PATCH', patch));
export const archiveHabit = (id: number) => request<void>(`/api/habits/${id}`, { method: 'DELETE' });
export const addCheckin = (id: number, date: string) =>
  request<Habit>(`/api/habits/${id}/checkins`, json('POST', { date }));
export const removeCheckin = (id: number, date: string) =>
  request<void>(`/api/habits/${id}/checkins/${date}`, { method: 'DELETE' });

export const getSummary = () => request<Summary>('/api/stats/summary');
export const getHeatmap = (from: string, to: string) =>
  request<HeatmapEntry[]>(`/api/stats/heatmap?from=${from}&to=${to}`);
export const getTrend = (days = 30) => request<TrendPoint[]>(`/api/stats/trend?days=${days}`);
export const getWeekdayRates = () => request<WeekdayRate[]>('/api/stats/weekday');
