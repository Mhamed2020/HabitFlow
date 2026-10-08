import type { AsyncState } from './useStats';
import type { Summary } from '../types/api';
import { ErrorState, Skeleton, pct } from './ui';

export default function KpiCards({ state }: { state: AsyncState<Summary> }) {
  const { data, loading, error, reload } = state;
  if (error) return <ErrorState message={`Could not load summary: ${error}`} onRetry={reload} />;

  const items = [
    { label: 'Active habits', value: data ? String(data.activeHabits) : '' },
    { label: "Today's rate", value: data ? pct(data.todayRate) : '' },
    { label: 'Best streak', value: data ? `${data.bestStreak} ${data.bestStreak === 1 ? 'day' : 'days'}` : '' },
    { label: '30-day rate', value: data ? pct(data.rate30d) : '' },
  ];

  return (
    <ul aria-label="Key metrics" aria-busy={loading} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((it) => (
        <li
          key={it.label}
          data-testid="kpi-card"
          aria-label={it.label}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {it.label}
          </p>
          {loading ? (
            <Skeleton className="mt-2 h-8 w-20" />
          ) : (
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">{it.value}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
