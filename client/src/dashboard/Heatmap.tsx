import { useEffect, useMemo, useRef, useState } from 'react';
import { addDays, parseDate, todayStr } from '../lib/dates';
import type { HeatmapEntry } from '../types/api';
import type { AsyncState } from './useStats';
import { Card, EmptyState, ErrorState, Skeleton } from './ui';

const LEVEL_CLASSES = [
  'bg-slate-200 dark:bg-slate-700',
  'bg-emerald-200 dark:bg-emerald-900',
  'bg-emerald-300 dark:bg-emerald-700',
  'bg-emerald-500 dark:bg-emerald-500',
  'bg-emerald-700 dark:bg-emerald-300',
];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ROW_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', ''];

export function levelFor(e: HeatmapEntry | undefined): number {
  if (!e || e.total <= 0 || e.count <= 0) return 0;
  return Math.min(4, Math.max(1, Math.ceil((e.count / e.total) * 4)));
}

/** Monday-based weekday index (0 = Monday). */
const mondayIndex = (d: Date) => (d.getDay() + 6) % 7;

interface Cell {
  date: string;
  entry?: HeatmapEntry;
}

export function buildWeeks(entries: HeatmapEntry[], today: string = todayStr()): (Cell | null)[][] {
  const byDate = new Map(entries.map((e) => [e.date, e]));
  const start = addDays(today, -364);
  const gridStart = addDays(start, -mondayIndex(parseDate(start)));
  const weeks: (Cell | null)[][] = [];
  for (let w = gridStart; w <= today; w = addDays(w, 7)) {
    const col: (Cell | null)[] = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(w, i);
      col.push(date < start || date > today ? null : { date, entry: byDate.get(date) });
    }
    weeks.push(col);
  }
  return weeks;
}

function describe(c: Cell): string {
  if (!c.entry || c.entry.total === 0) return `${c.date}: no habits scheduled`;
  return `${c.date}: ${c.entry.count}/${c.entry.total} habits completed`;
}

function HeatmapGrid({ entries }: { entries: HeatmapEntry[] }) {
  const weeks = useMemo(() => buildWeeks(entries), [entries]);
  const [hover, setHover] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [weeks]);

  const monthLabels = weeks.map((col, i) => {
    const first = col.find((c) => c !== null);
    if (!first) return '';
    const d = parseDate(first.date);
    const prev = i > 0 ? weeks[i - 1].find((c) => c !== null) : undefined;
    return !prev || parseDate(prev.date).getMonth() !== d.getMonth() ? MONTHS[d.getMonth()] : '';
  });

  return (
    <div>
      <div ref={scrollRef} className="overflow-x-auto pb-2 dark:[color-scheme:dark]" data-testid="heatmap-scroll">
        <div className="inline-flex gap-2" role="img" aria-label="Habit completion heatmap for the last 365 days">
          <div
            className="flex flex-col gap-[3px] pt-[16px] text-[10px] leading-3 text-slate-500 dark:text-slate-400"
            aria-hidden="true"
          >
            {ROW_LABELS.map((l, i) => (
              <div key={i} className="h-3">
                {l}
              </div>
            ))}
          </div>
          <div>
            <div className="flex gap-[3px] pb-1 text-[10px] leading-3 text-slate-500 dark:text-slate-400" aria-hidden="true">
              {monthLabels.map((m, i) => (
                <div key={i} className="relative h-3 w-3">
                  <span className="absolute left-0 whitespace-nowrap">{m}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-[3px]">
              {weeks.map((col, wi) => (
                <div key={wi} className="flex flex-col gap-[3px]">
                  {col.map((c, di) =>
                    c ? (
                      <div
                        key={di}
                        data-testid="heatmap-cell"
                        data-level={levelFor(c.entry)}
                        title={describe(c)}
                        onMouseEnter={() => setHover(describe(c))}
                        onMouseLeave={() => setHover(null)}
                        className={`h-3 w-3 rounded-sm ${LEVEL_CLASSES[levelFor(c.entry)]}`}
                      />
                    ) : (
                      <div key={di} className="h-3 w-3" />
                    ),
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span aria-live="polite" className="min-h-4">
          {hover ?? 'Hover a day for details'}
        </span>
        <span className="flex items-center gap-1" aria-label="Legend: less to more">
          Less
          {LEVEL_CLASSES.map((cls, i) => (
            <span key={i} className={`h-3 w-3 rounded-sm ${cls}`} />
          ))}
          More
        </span>
      </div>
    </div>
  );
}

export default function Heatmap({ state }: { state: AsyncState<HeatmapEntry[]> }) {
  const { data, loading, error, reload } = state;
  return (
    <Card title="Yearly activity" subtitle="Completion per day over the last 365 days">
      {error ? (
        <ErrorState message={`Could not load heatmap: ${error}`} onRetry={reload} />
      ) : loading || !data ? (
        <Skeleton className="h-[130px] w-full" />
      ) : data.every((e) => e.count === 0) ? (
        <EmptyState>No check-ins yet. Complete a habit to start filling the heatmap.</EmptyState>
      ) : (
        <HeatmapGrid entries={data} />
      )}
    </Card>
  );
}
