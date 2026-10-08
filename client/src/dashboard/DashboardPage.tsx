import Heatmap from './Heatmap';
import HabitRanking from './HabitRanking';
import KpiCards from './KpiCards';
import TrendChart from './TrendChart';
import WeekdayChart from './WeekdayChart';
import { useStats } from './useStats';
import { EmptyState } from './ui';

export default function DashboardPage() {
  const { summary, heatmap, trend, weekday, habits } = useStats();
  const noHabits =
    !summary.loading && !summary.error && summary.data !== null && summary.data.activeHabits === 0;

  return (
    <div className="space-y-4" data-testid="dashboard">
      <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 sm:text-2xl">Dashboard</h1>
      <KpiCards state={summary} />
      {noHabits ? (
        <EmptyState>No active habits yet. Create your first habit to see your stats here.</EmptyState>
      ) : (
        <>
          <Heatmap state={heatmap} />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <TrendChart state={trend} />
            <WeekdayChart state={weekday} />
          </div>
          <HabitRanking state={habits} />
        </>
      )}
    </div>
  );
}
