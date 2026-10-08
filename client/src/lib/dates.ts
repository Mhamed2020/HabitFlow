const pad = (n: number) => String(n).padStart(2, '0');

/** Local-time 'YYYY-MM-DD' (never toISOString). */
export function formatDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayStr(): string {
  return formatDate(new Date());
}

/** Parse 'YYYY-MM-DD' as a local date. */
export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s: string, n: number): string {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return formatDate(d);
}

/** The 7 dates ending today, oldest first (matches Habit.last7). */
export function last7Dates(today: string = todayStr()): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
}
