import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '../hooks/useTheme';

function Harness() {
  const { theme, toggle } = useTheme();
  return <ThemeToggle theme={theme} onToggle={toggle} />;
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('labels the button for the opposite theme and calls onToggle', async () => {
    const onToggle = vi.fn();
    render(<ThemeToggle theme="light" onToggle={onToggle} />);
    const btn = screen.getByRole('button', { name: 'Switch to dark theme' });
    expect(btn).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(btn);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('toggles the dark class on <html> and persists the choice', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Switch to dark theme' }));
    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem('habitflow-theme')).toBe('dark');
    const btn = screen.getByRole('button', { name: 'Switch to light theme' });
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(btn);
    expect(document.documentElement).not.toHaveClass('dark');
    expect(localStorage.getItem('habitflow-theme')).toBe('light');
  });

  it('restores the saved theme on mount', () => {
    localStorage.setItem('habitflow-theme', 'dark');
    render(<Harness />);
    expect(document.documentElement).toHaveClass('dark');
  });
});
