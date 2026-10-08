import { addDays, jsWeekday } from './dates.js';

export function isScheduled(frequency: number[], date: string): boolean {
  return frequency.length === 0 || frequency.includes(jsWeekday(date));
}

/**
 * Only scheduled days count. Unscheduled days are skipped (never break a
 * streak). An unchecked *today* does not break the current streak.
 */
export function computeStreaks(
  frequency: number[],
  checked: Set<string>,
  todayStr: string,
): { currentStreak: number; bestStreak: number } {
  if (checked.size === 0) return { currentStreak: 0, bestStreak: 0 };
  let earliest = todayStr;
  for (const d of checked) if (d < earliest) earliest = d;

  let currentStreak = 0;
  for (let d = todayStr; d >= earliest; d = addDays(d, -1)) {
    if (!isScheduled(frequency, d)) continue;
    if (checked.has(d)) currentStreak++;
    else if (d === todayStr) continue;
    else break;
  }

  let bestStreak = 0;
  let run = 0;
  for (let d = earliest; d <= todayStr; d = addDays(d, 1)) {
    if (!isScheduled(frequency, d)) continue;
    if (checked.has(d)) {
      run++;
      if (run > bestStreak) bestStreak = run;
    } else if (d !== todayStr) {
      run = 0;
    }
  }
  return { currentStreak, bestStreak: Math.max(bestStreak, currentStreak) };
}

/** Oldest -> today, 7 booleans: was the habit checked that day. */
export function computeLast7(checked: Set<string>, todayStr: string): boolean[] {
  const out: boolean[] = [];
  for (let i = 6; i >= 0; i--) out.push(checked.has(addDays(todayStr, -i)));
  return out;
}
