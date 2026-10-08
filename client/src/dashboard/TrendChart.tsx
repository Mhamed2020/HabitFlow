import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { parseDate } from '../lib/dates';
import type { TrendPoint } from '../types/api';
import type { AsyncState } from './useStats';
import { Card, EmptyState, ErrorState, Skeleton, pct } from './ui';

const shortDate = (s: string) => {
  const d = parseDate(s);
  return `${d.getDate()}/${d.getMonth() + 1}`;
};

export default function TrendChart({ state }: { state: AsyncState<TrendPoint[]> }) {
  const { data, loading, error, reload } = state;
  return (
    <Card title="30-day completion" subtitle="Share of scheduled habits completed each day">
      {error ? (
        <ErrorState message={`Could not load trend: ${error}`} onRetry={reload} />
      ) : loading || !data ? (
        <Skeleton className="h-[240px] w-full" />
      ) : data.length === 0 || data.every((p) => p.rate === 0) ? (
        <EmptyState>No completion data for the last 30 days.</EmptyState>
      ) : (
        <div
          className="h-[240px] w-full text-slate-500 dark:text-slate-400"
          role="img"
          aria-label="Line chart of daily completion rate over the last 30 days"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <defs>
                <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="currentColor" strokeOpacity={0.15} vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={shortDate}
                tick={{ fill: 'currentColor', fontSize: 11 }}
                stroke="currentColor"
                minTickGap={24}
              />
              <YAxis
                domain={[0, 1]}
                tickFormatter={pct}
                tick={{ fill: 'currentColor', fontSize: 11 }}
                stroke="currentColor"
              />
              <Tooltip
                formatter={(v) => [pct(Number(v)), 'Completion']}
                labelFormatter={(l) => String(l)}
                contentStyle={{ borderRadius: 8, fontSize: 12 }}
              />
              <Area type="monotone" dataKey="rate" stroke="#6366f1" strokeWidth={2} fill="url(#trendFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
