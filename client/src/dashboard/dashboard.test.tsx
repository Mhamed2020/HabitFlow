import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../api';
import DashboardPage from './DashboardPage';
import KpiCards from './KpiCards';
import type { AsyncState } from './useStats';
import type { Summary } from '../types/api';

vi.mock('../api', () => ({
  getSummary: vi.fn(),
  getHeatmap: vi.fn(),
  getTrend: vi.fn(),
  getWeekdayRates: vi.fn(),
  listHabits: vi.fn(),
}));

const m = vi.mocked(api);

function state<T>(over: Partial<AsyncState<T>>): AsyncState<T> {
  return { data: null, loading: false, error: null, reload: () => {}, ...over };
}

describe('KpiCards', () => {
  it('renders the four KPI values', () => {
    const data: Summary = { activeHabits: 5, todayRate: 0.62, bestStreak: 12, rate30d: 0.8 };
    render(<KpiCards state={state({ data })} />);
    const cards = screen.getAllByTestId('kpi-card');
    expect(cards).toHaveLength(4);
    expect(within(screen.getByLabelText('Active habits')).getByText('5')).toBeInTheDocument();
    expect(within(screen.getByLabelText("Today's rate")).getByText('62%')).toBeInTheDocument();
    expect(within(screen.getByLabelText('Best streak')).getByText('12 days')).toBeInTheDocument();
    expect(within(screen.getByLabelText('30-day rate')).getByText('80%')).toBeInTheDocument();
  });

  it('shows 0% (not NaN) for zero rates and singular "1 day"', () => {
    render(<KpiCards state={state({ data: { activeHabits: 1, todayRate: 0, bestStreak: 1, rate30d: 0 } })} />);
    expect(screen.getByText('1 day')).toBeInTheDocument();
    expect(screen.getAllByText('0%')).toHaveLength(2);
    expect(document.body.textContent).not.toMatch(/NaN/);
  });

  it('does not show values while loading', () => {
    render(<KpiCards state={state({ loading: true })} />);
    expect(screen.getAllByTestId('kpi-card')).toHaveLength(4);
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it('shows an error with a working Retry button', async () => {
    const reload = vi.fn();
    render(<KpiCards state={state({ error: 'boom', reload })} />);
    expect(screen.getByRole('alert')).toHaveTextContent('boom');
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(reload).toHaveBeenCalledTimes(1);
  });
});

async function renderPage() {
  render(<DashboardPage />);
  // let every section's request settle inside act()
  await act(async () => {});
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    m.getHeatmap.mockResolvedValue([]);
    m.getTrend.mockResolvedValue([]);
    m.getWeekdayRates.mockResolvedValue([]);
    m.listHabits.mockResolvedValue([]);
  });

  it('shows the loading state first (skeleton KPI cards)', async () => {
    m.getSummary.mockReturnValue(new Promise(() => {}));
    await renderPage();
    expect(screen.getByLabelText('Key metrics')).toHaveAttribute('aria-busy', 'true');
  });

  it('shows the empty state and no charts when there are no active habits', async () => {
    m.getSummary.mockResolvedValue({ activeHabits: 0, todayRate: 0, bestStreak: 0, rate30d: 0 });
    await renderPage();
    expect(await screen.findByText(/No active habits yet/i)).toBeInTheDocument();
    expect(screen.queryByText('Yearly activity')).not.toBeInTheDocument();
    expect(screen.queryByText('Habit ranking')).not.toBeInTheDocument();
  });

  it('shows the sections when there are habits', async () => {
    m.getSummary.mockResolvedValue({ activeHabits: 2, todayRate: 0.5, bestStreak: 3, rate30d: 0.4 });
    await renderPage();
    expect(await screen.findByText('50%')).toBeInTheDocument();
    expect(screen.getByText('Yearly activity')).toBeInTheDocument();
    expect(screen.getByText('Habit ranking')).toBeInTheDocument();
    expect(screen.queryByText(/No active habits yet/i)).not.toBeInTheDocument();
  });

  it('shows an error state when the summary request fails', async () => {
    m.getSummary.mockRejectedValue(new Error('network down'));
    await renderPage();
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('network down'));
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});
