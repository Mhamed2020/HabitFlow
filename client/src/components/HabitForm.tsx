import { useState, type FormEvent } from 'react';
import type { Habit, HabitInput } from '../types/api';
import { WEEKDAYS } from '../lib/weekdays';

interface Props {
  /** When provided the form edits this habit. */
  initial?: Habit;
  onSubmit: (input: Required<HabitInput>) => Promise<void> | void;
  onCancel?: () => void;
}

const DEFAULT_COLOR = '#6366f1';

export default function HabitForm({ initial, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [color, setColor] = useState(initial?.color ?? DEFAULT_COLOR);
  const [days, setDays] = useState<number[]>(initial?.frequency ?? []);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const uid = initial?.id ?? 'new';

  const toggleDay = (d: number) =>
    setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Name is required');
      return;
    }
    if (trimmed.length > 60) {
      setError('Name must be 60 characters or fewer');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      // 7 selected days is the same as every day
      const frequency = days.length === 7 ? [] : [...days].sort((a, b) => a - b);
      await onSubmit({ name: trimmed, color, frequency });
      if (!initial) {
        setName('');
        setColor(DEFAULT_COLOR);
        setDays([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  const input =
    'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800';

  return (
    <form
      onSubmit={handleSubmit}
      aria-label={initial ? 'Edit habit' : 'New habit'}
      noValidate
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/60"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor={`habit-name-${uid}`} className="text-sm font-medium">
            Name
          </label>
          <input
            id={`habit-name-${uid}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder="e.g. Read 20 minutes"
            className={input}
            aria-invalid={error ? true : undefined}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`habit-color-${uid}`} className="text-sm font-medium">
            Color
          </label>
          <input
            id={`habit-color-${uid}`}
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-10 w-16 cursor-pointer rounded-lg border border-slate-300 bg-white p-1 dark:border-slate-600 dark:bg-slate-800"
          />
        </div>
      </div>

      <fieldset>
        <legend className="text-sm font-medium">Frequency</legend>
        <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
          Leave all days unchecked for every day.
        </p>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((d) => {
            const on = days.includes(d.value);
            return (
              <label
                key={d.value}
                className={`cursor-pointer select-none rounded-lg border px-3 py-1.5 text-sm ${
                  on
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-slate-300 dark:border-slate-600'
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={on}
                  onChange={() => toggleDay(d.value)}
                  aria-label={d.long}
                />
                <span aria-hidden="true">{d.short}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {saving ? 'Saving...' : initial ? 'Save changes' : 'Add habit'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm dark:border-slate-600"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
