import type { Habit } from '../types/api';
import { last7Dates, parseDate } from '../lib/dates';

interface Props {
  habit: Habit;
  /** 7 dates, oldest first. Defaults to the 7 days ending today. */
  dates?: string[];
  onToggle: (habit: Habit, date: string, index: number) => void;
}

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CheckinGrid({ habit, dates, onToggle }: Props) {
  const days = dates ?? last7Dates();
  return (
    <ul className="grid grid-cols-7 gap-1.5 sm:gap-2" aria-label={`Last 7 days for ${habit.name}`}>
      {days.map((date, i) => {
        const checked = habit.last7[i] ?? false;
        const wd = parseDate(date).getDay();
        const scheduled = habit.frequency.length === 0 || habit.frequency.includes(wd);
        return (
          <li key={date} className="flex flex-col items-center gap-1">
            <span className="text-[10px] uppercase text-slate-500 dark:text-slate-400">{DAY[wd]}</span>
            <button
              type="button"
              role="checkbox"
              aria-checked={checked}
              aria-label={`${habit.name} on ${date}`}
              title={scheduled ? date : `${date} (not scheduled)`}
              onClick={() => onToggle(habit, date, i)}
              style={checked ? { backgroundColor: habit.color, borderColor: habit.color } : undefined}
              className={`h-9 w-9 rounded-lg border-2 text-white transition sm:h-10 sm:w-10 ${
                checked ? '' : 'border-slate-300 dark:border-slate-600'
              } ${scheduled ? '' : 'opacity-40'}`}
            >
              {checked ? <span aria-hidden="true">&#10003;</span> : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
