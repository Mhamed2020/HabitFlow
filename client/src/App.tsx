import { useEffect, useState } from 'react';
import DemoBanner from './components/DemoBanner';
import ThemeToggle from './components/ThemeToggle';
import { useTheme } from './hooks/useTheme';
import HabitsPage from './pages/HabitsPage';
import DashboardPage from './dashboard/DashboardPage';

type View = 'habits' | 'dashboard';

const TABS: { id: View; label: string }[] = [
  { id: 'habits', label: 'Habits' },
  { id: 'dashboard', label: 'Dashboard' },
];

function viewFromHash(): View {
  return window.location.hash === '#dashboard' ? 'dashboard' : 'habits';
}

export default function App() {
  const { theme, toggle } = useTheme();
  const [view, setView] = useState<View>(viewFromHash);

  useEffect(() => {
    const onHash = () => setView(viewFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const select = (v: View) => {
    setView(v);
    try {
      window.location.hash = v === 'habits' ? '#habits' : '#dashboard';
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <h1 className="text-lg font-bold tracking-tight">HabitFlow</h1>
          <nav aria-label="Main" className="order-3 flex w-full gap-1 sm:order-none sm:w-auto">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => select(t.id)}
                aria-current={view === t.id ? 'page' : undefined}
                className={`flex-1 rounded-lg px-4 py-1.5 text-sm font-medium sm:flex-none ${
                  view === t.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
          <ThemeToggle theme={theme} onToggle={toggle} />
        </div>
      </header>
      <DemoBanner />
      <main className="mx-auto max-w-5xl px-4 py-6">
        {view === 'habits' ? <HabitsPage /> : <DashboardPage />}
      </main>
    </div>
  );
}
