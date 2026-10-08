import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import HabitForm from './HabitForm';

describe('HabitForm', () => {
  it('shows "Name is required" and does not submit with an empty name', async () => {
    const onSubmit = vi.fn();
    render(<HabitForm onSubmit={onSubmit} />);
    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), '   ');
    await userEvent.click(screen.getByRole('button', { name: 'Add habit' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Name is required');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits trimmed name, color and sorted frequency, then resets', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<HabitForm onSubmit={onSubmit} />);
    const name = screen.getByRole('textbox', { name: 'Name' });
    await userEvent.type(name, '  Read  ');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Wednesday' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Monday' }));
    await userEvent.click(screen.getByRole('button', { name: 'Add habit' }));
    expect(onSubmit).toHaveBeenCalledWith({ name: 'Read', color: '#6366f1', frequency: [1, 3] });
    await vi.waitFor(() => expect(name).toHaveValue(''));
  });

  it('sends frequency [] when no day is selected (every day)', async () => {
    const onSubmit = vi.fn();
    render(<HabitForm onSubmit={onSubmit} />);
    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Run');
    await userEvent.click(screen.getByRole('button', { name: 'Add habit' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ frequency: [] }));
  });

  it('displays an error thrown by onSubmit', async () => {
    render(<HabitForm onSubmit={() => Promise.reject(new Error('server said no'))} />);
    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Run');
    await userEvent.click(screen.getByRole('button', { name: 'Add habit' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('server said no');
  });
});
