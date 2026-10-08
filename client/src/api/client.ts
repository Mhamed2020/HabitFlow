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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: init?.body ? { 'Content-Type': 'application/json', ...init.headers } : init?.headers,
    });
  } catch {
    throw new ApiError('NETWORK', 'Network error: could not reach the server');
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
