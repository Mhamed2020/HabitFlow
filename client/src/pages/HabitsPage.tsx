import { useState } from 'react';
import HabitForm from '../components/HabitForm';
import HabitItem from '../components/HabitItem';
import { useHabits } from '../hooks/useHabits';

export default function HabitsPage() {
  const { habits, loading, loadError, actionError, dismissActionError, reload, create, update, archive, toggleCheckin } =
    useHabits();
  const [adding, setAdding] = useState(false);

  return (
    <section aria-labelledby="habits-title" className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 id="habits-title" className="text-xl font-semibold">
          Your habits
        </h2>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            New habit
          </button>
        )}
      </div>

      {adding && (
        <HabitForm
          onCancel={() => setAdding(false)}
          onSubmit={async (input) => {
            await create(input);
            setAdding(false);
          }}
        />
      )}

      {actionError && (
        <div
          role="alert"
          className="flex items-start justify-between gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
        >
          <span>{actionError}</span>
          <button type="button" onClick={dismissActionError} aria-label="Dismiss error" className="font-bold">
            &times;
          </button>
        </div>
      )}

      {loading ? (
        <p role="status" className="py-8 text-center text-slate-500 dark:text-slate-400">
          Loading habits...
        </p>
      ) : loadError ? (
        <div role="alert" className="rounded-xl border border-red-300 p-6 text-center dark:border-red-800">
          <p className="mb-3 text-red-700 dark:text-red-300">Could not load habits: {loadError}</p>
          <button
            type="button"
            onClick={() => void reload()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white"
          >
            Retry
          </button>
        </div>
      ) : habits.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-600">
          <p className="font-medium">No habits yet</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Create your first habit to start tracking.</p>
        </div>
      ) : (
        <ul className="space-y-3" aria-label="Habits">
          {habits.map((h) => (
            <HabitItem key={h.id} habit={h} onToggle={toggleCheckin} onUpdate={update} onArchive={archive} />
          ))}
        </ul>
      )}
    </section>
  );
}
