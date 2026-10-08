import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

vi.mock('./api', () => ({
  listHabits: vi.fn().mockResolvedValue([]),
  getSummary: vi.fn().mockResolvedValue({ activeHabits: 0, todayRate: 0, bestStreak: 0, rate30d: 0 }),
  getHeatmap: vi.fn().mockResolvedValue([]),
  getTrend: vi.fn().mockResolvedValue([]),
  getWeekdayRates: vi.fn().mockResolvedValue([]),
}));

const navBtn = (name: string) => screen.getByRole('button', { name });

describe('App navigation', () => {
  beforeEach(() => {
    window.location.hash = '';
  });

  it('starts on Habits and switches to Dashboard via the nav', async () => {
    render(<App />);
    expect(navBtn('Habits')).toHaveAttribute('aria-current', 'page');
    await userEvent.click(navBtn('Dashboard'));
    expect(navBtn('Dashboard')).toHaveAttribute('aria-current', 'page');
    expect(await screen.findByTestId('dashboard')).toBeInTheDocument();
  });

  it('follows hashchange (browser Back / manual hash)', async () => {
    render(<App />);
    await act(async () => {
      window.location.hash = '#dashboard';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(navBtn('Dashboard')).toHaveAttribute('aria-current', 'page');
    await act(async () => {
      window.location.hash = '#habits';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(navBtn('Habits')).toHaveAttribute('aria-current', 'page');
  });
});
