// All dates are 'YYYY-MM-DD' in LOCAL time. Never use toISOString() for dates.

const pad = (n: number) => String(n).padStart(2, '0');

export function formatDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Parse 'YYYY-MM-DD' as a local date at noon (DST-safe). */
export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

/** Today in local time. Reads the clock on every call so fake timers work. */
export function today(): string {
  return formatDate(new Date());
}

export function addDays(date: string, n: number): string {
  const d = parseDate(date);
  d.setDate(d.getDate() + n);
  return formatDate(d);
}

/** JS getDay(): 0 = Sunday ... 6 = Saturday. */
export function jsWeekday(date: string): number {
  return parseDate(date).getDay();
}

/** 0 = Monday ... 6 = Sunday. */
export function mondayWeekday(date: string): number {
  return (jsWeekday(date) + 6) % 7;
}

export function isValidDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return formatDate(parseDate(s)) === s;
}

/** Inclusive list of dates from..to. */
export function dateRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}
