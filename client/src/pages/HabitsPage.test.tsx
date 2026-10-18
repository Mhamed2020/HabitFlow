import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../api';
import HabitsPage from './HabitsPage';
import { last7Dates } from '../lib/dates';
import type { Habit } from '../types/api';

vi.mock('../api', () => ({
  listHabits: vi.fn(),
  createHabit: vi.fn(),
  updateHabit: vi.fn(),
  archiveHabit: vi.fn(),
  addCheckin: vi.fn(),
  removeCheckin: vi.fn(),
}));
const m = vi.mocked(api);

const habit = (over: Partial<Habit> = {}): Habit => ({
  id: 1,
  name: 'Read',
  color: '#6366f1',
  frequency: [],
  createdAt: '2025-01-01',
  archived: false,
  currentStreak: 0,
  bestStreak: 0,
  last7: Array(7).fill(false),
  ...over,
});

const todayBox = () => screen.getByRole('checkbox', { name: `Read on ${last7Dates()[6]}` });

describe('HabitsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('shows loading, then the empty state', async () => {
    m.listHabits.mockResolvedValue([]);
    render(<HabitsPage />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading habits');
    expect(await screen.findByText('No habits yet')).toBeInTheDocument();
  });

  it('shows a load error with Retry that reloads', async () => {
    m.listHabits.mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce([habit()]);
    render(<HabitsPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('down');
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('checkbox', { name: `Read on ${last7Dates()[0]}` })).toBeInTheDocument();
  });

  it('optimistically checks a day and keeps it on success', async () => {
    m.listHabits.mockResolvedValue([habit()]);
    let resolve!: (h: Habit) => void;
    m.addCheckin.mockReturnValue(new Promise((r) => (resolve = r)));
    render(<HabitsPage />);
    const box = await screen.findByRole('checkbox', { name: `Read on ${last7Dates()[6]}` });
    expect(box).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(box);
    // updated before the request resolves
    expect(todayBox()).toHaveAttribute('aria-checked', 'true');
    expect(m.addCheckin).toHaveBeenCalledWith(1, last7Dates()[6]);
    resolve(habit());
    await waitFor(() => expect(todayBox()).toHaveAttribute('aria-checked', 'true'));
  });

  it('rolls back and shows an alert when the check-in request fails', async () => {
    m.listHabits.mockResolvedValue([habit()]);
    m.addCheckin.mockRejectedValue(new Error('boom'));
    render(<HabitsPage />);
    await userEvent.click(await screen.findByRole('checkbox', { name: `Read on ${last7Dates()[6]}` }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Could not update/);
    expect(todayBox()).toHaveAttribute('aria-checked', 'false');
  });

  it('unchecking calls removeCheckin and rolls back on failure', async () => {
    m.listHabits.mockResolvedValue([habit({ last7: [false, false, false, false, false, false, true] })]);
    m.removeCheckin.mockRejectedValue(new Error('boom'));
    render(<HabitsPage />);
    await userEvent.click(await screen.findByRole('checkbox', { name: `Read on ${last7Dates()[6]}` }));
    expect(m.removeCheckin).toHaveBeenCalledWith(1, last7Dates()[6]);
    await screen.findByRole('alert');
    expect(todayBox()).toHaveAttribute('aria-checked', 'true');
  });

  it('creates a habit through the form and lists it', async () => {
    m.listHabits.mockResolvedValue([]);
    m.createHabit.mockResolvedValue(habit({ name: 'Run' }));
    render(<HabitsPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'New habit' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Run');
    await userEvent.click(screen.getByRole('button', { name: 'Add habit' }));
    expect(m.createHabit).toHaveBeenCalledWith({ name: 'Run', color: '#6366f1', frequency: [] });
    expect(await screen.findByRole('checkbox', { name: `Run on ${last7Dates()[6]}` })).toBeInTheDocument();
  });

  it('archives a habit and restores it in place with Undo', async () => {
    m.listHabits.mockResolvedValue([habit(), habit({ id: 2, name: 'Run' })]);
    m.archiveHabit.mockResolvedValue(undefined);
    m.updateHabit.mockResolvedValue(habit());
    render(<HabitsPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Archive Read' }));
    expect(m.archiveHabit).toHaveBeenCalledWith(1);
    expect(await screen.findByText('"Read" archived')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Read' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(m.updateHabit).toHaveBeenCalledWith(1, { archived: false });
    await waitFor(() =>
      expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Read', 'Run']),
    );
    expect(screen.queryByText('"Read" archived')).not.toBeInTheDocument();
  });

  it('hides the Undo notice after a few seconds', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      m.listHabits.mockResolvedValue([habit()]);
      m.archiveHabit.mockResolvedValue(undefined);
      render(<HabitsPage />);
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      await user.click(await screen.findByRole('button', { name: 'Archive Read' }));
      expect(await screen.findByRole('button', { name: 'Undo' })).toBeInTheDocument();
      await act(() => vi.advanceTimersByTimeAsync(6000));
      expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows an alert when Undo fails and keeps the habit archived', async () => {
    m.listHabits.mockResolvedValue([habit()]);
    m.archiveHabit.mockResolvedValue(undefined);
    m.updateHabit.mockRejectedValue(new Error('down'));
    render(<HabitsPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Archive Read' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Undo' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not restore "Read": down');
    expect(screen.queryByRole('heading', { name: 'Read' })).not.toBeInTheDocument();
  });
});
