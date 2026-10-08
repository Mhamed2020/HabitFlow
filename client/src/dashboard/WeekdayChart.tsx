import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { WeekdayRate } from '../types/api';
import type { AsyncState } from './useStats';
import { Card, EmptyState, ErrorState, Skeleton, pct } from './ui';

export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function WeekdayChart({ state }: { state: AsyncState<WeekdayRate[]> }) {
  const { data, loading, error, reload } = state;
  const rows = data
    ? [...data].sort((a, b) => a.weekday - b.weekday).map((d) => ({ ...d, label: WEEKDAY_LABELS[d.weekday] }))
    : [];
  return (
    <Card title="By weekday" subtitle="Average completion, Monday to Sunday">
      {error ? (
        <ErrorState message={`Could not load weekday stats: ${error}`} onRetry={reload} />
      ) : loading || !data ? (
        <Skeleton className="h-[240px] w-full" />
      ) : rows.length === 0 || rows.every((r) => r.rate === 0) ? (
        <EmptyState>No weekday data yet.</EmptyState>
      ) : (
        <div
          className="h-[240px] w-full text-slate-500 dark:text-slate-400"
          role="img"
          aria-label="Bar chart of average completion rate by weekday"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid stroke="currentColor" strokeOpacity={0.15} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: 'currentColor', fontSize: 11 }} stroke="currentColor" />
              <YAxis
                domain={[0, 1]}
                tickFormatter={pct}
                tick={{ fill: 'currentColor', fontSize: 11 }}
                stroke="currentColor"
              />
              <Tooltip
                cursor={{ fill: 'currentColor', fillOpacity: 0.1 }}
                formatter={(v) => [pct(Number(v)), 'Completion']}
                contentStyle={{ borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="rate" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
