// Mirrors the API contract in .claude/skills/habitflow-team/SKILL.md

export interface Habit {
  id: number;
  name: string;
  color: string; // '#RRGGBB'
  /** Weekdays (0 = Sunday ... 6 = Saturday); [] = every day */
  frequency: number[];
  createdAt: string; // 'YYYY-MM-DD'
  archived: boolean;
  currentStreak: number;
  bestStreak: number;
  /** Oldest -> newest; last element is today */
  last7: boolean[];
}

export interface HabitInput {
  name: string;
  color?: string;
  frequency?: number[];
}

export interface HabitPatch extends Partial<HabitInput> {
  archived?: boolean;
}

export interface Summary {
  activeHabits: number;
  todayRate: number;
  bestStreak: number;
  rate30d: number;
}

export interface HeatmapEntry {
  date: string;
  count: number;
  total: number;
}

export interface TrendPoint {
  date: string;
  rate: number;
}

export interface WeekdayRate {
  /** 0 = Monday ... 6 = Sunday */
  weekday: number;
  rate: number;
}

export type ApiErrorCode = 'VALIDATION_ERROR' | 'NOT_FOUND' | 'INTERNAL';

export interface ApiErrorBody {
  error: { code: ApiErrorCode; message: string };
}

export class ApiError extends Error {
  readonly code: ApiErrorCode | 'NETWORK';
  readonly status: number;
  constructor(code: ApiErrorCode | 'NETWORK', message: string, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}
