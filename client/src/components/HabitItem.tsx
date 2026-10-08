import { useState } from 'react';
import type { Habit, HabitInput } from '../types/api';
import { describeFrequency } from '../lib/weekdays';
import CheckinGrid from './CheckinGrid';
import HabitForm from './HabitForm';

interface Props {
  habit: Habit;
  dates?: string[];
  onToggle: (habit: Habit, date: string, index: number) => void;
  onUpdate: (habit: Habit, input: Required<HabitInput>) => Promise<void>;
  onArchive: (habit: Habit) => void;
}

export default function HabitItem({ habit, dates, onToggle, onUpdate, onArchive }: Props) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <li>
        <HabitForm
          initial={habit}
          onCancel={() => setEditing(false)}
          onSubmit={async (input) => {
            await onUpdate(habit, input);
            setEditing(false);
          }}
        />
      </li>
    );
  }

  return (
    <li
      aria-label={habit.name}
      className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/60"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 font-semibold">
            <span
              aria-hidden="true"
              className="inline-block h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: habit.color }}
            />
            <span className="truncate">{habit.name}</span>
          </h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {describeFrequency(habit.frequency)} &middot; Streak {habit.currentStreak} &middot; Best {habit.bestStreak}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label={`Edit ${habit.name}`}
            className="rounded-lg px-2 py-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onArchive(habit)}
            aria-label={`Archive ${habit.name}`}
            className="rounded-lg px-2 py-1 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-slate-700"
          >
            Archive
          </button>
        </div>
      </div>
      <div className="mt-3">
        <CheckinGrid habit={habit} dates={dates} onToggle={onToggle} />
      </div>
    </li>
  );
}
