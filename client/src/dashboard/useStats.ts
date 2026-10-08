import { useCallback, useEffect, useState } from 'react';
import { getHeatmap, getSummary, getTrend, getWeekdayRates, listHabits } from '../api';
import { addDays, todayStr } from '../lib/dates';
import type { Habit, HeatmapEntry, Summary, TrendPoint, WeekdayRate } from '../types/api';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useAsync<T>(fetcher: () => Promise<T>): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetcher().then(
      (d) => {
        if (cancelled) return;
        setData(d);
        setLoading(false);
      },
      (e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Something went wrong');
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data, loading, error, reload };
}

export const HEATMAP_DAYS = 365;

export function useStats() {
  const summary = useAsync<Summary>(getSummary);
  const heatmap = useAsync<HeatmapEntry[]>(() => {
    const to = todayStr();
    return getHeatmap(addDays(to, -(HEATMAP_DAYS - 1)), to);
  });
  const trend = useAsync<TrendPoint[]>(() => getTrend(30));
  const weekday = useAsync<WeekdayRate[]>(getWeekdayRates);
  const habits = useAsync<Habit[]>(listHabits);
  return { summary, heatmap, trend, weekday, habits };
}
