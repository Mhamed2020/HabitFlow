import type { Habit } from '../types/api';
import type { AsyncState } from './useStats';
import { Card, EmptyState, ErrorState, Skeleton } from './ui';

export function rankHabits(habits: Habit[]): Habit[] {
  return habits
    .filter((h) => !h.archived)
    .sort((a, b) => b.currentStreak - a.currentStreak || b.bestStreak - a.bestStreak || a.name.localeCompare(b.name));
}

export default function HabitRanking({ state }: { state: AsyncState<Habit[]> }) {
  const { data, loading, error, reload } = state;
  const ranked = data ? rankHabits(data) : [];
  const max = Math.max(1, ...ranked.map((h) => Math.max(h.currentStreak, h.bestStreak)));

  return (
    <Card title="Habit ranking" subtitle="Sorted by current streak; faded bar shows best streak">
      {error ? (
        <ErrorState message={`Could not load habits: ${error}`} onRetry={reload} />
      ) : loading || !data ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      ) : ranked.length === 0 ? (
        <EmptyState>No habits yet. Create one to see the ranking.</EmptyState>
      ) : (
        <ol aria-label="Habits ranked by streak" className="space-y-3">
          {ranked.map((h, i) => (
            <li key={h.id} data-testid="ranking-row" className="text-sm">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate font-medium text-slate-900 dark:text-slate-100">
                  {i + 1}. {h.name}
                </span>
                <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
                  {h.currentStreak} current / {h.bestStreak} best
                </span>
              </div>
              <div
                className="relative mt-1 h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
                role="meter"
                aria-label={`${h.name} current streak`}
                aria-valuemin={0}
                aria-valuemax={max}
                aria-valuenow={h.currentStreak}
              >
                <div
                  className="absolute inset-y-0 left-0 rounded-full opacity-40"
                  style={{ width: `${(h.bestStreak / max) * 100}%`, backgroundColor: h.color }}
                />
                <div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ width: `${(h.currentStreak / max) * 100}%`, backgroundColor: h.color }}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
