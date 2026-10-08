/** Display order Monday..Sunday, values use JS getDay() (0 = Sunday). */
export const WEEKDAYS: { value: number; short: string; long: string }[] = [
  { value: 1, short: 'Mon', long: 'Monday' },
  { value: 2, short: 'Tue', long: 'Tuesday' },
  { value: 3, short: 'Wed', long: 'Wednesday' },
  { value: 4, short: 'Thu', long: 'Thursday' },
  { value: 5, short: 'Fri', long: 'Friday' },
  { value: 6, short: 'Sat', long: 'Saturday' },
  { value: 0, short: 'Sun', long: 'Sunday' },
];

export function describeFrequency(freq: number[]): string {
  if (freq.length === 0 || freq.length === 7) return 'Every day';
  return WEEKDAYS.filter((d) => freq.includes(d.value))
    .map((d) => d.short)
    .join(', ');
}
