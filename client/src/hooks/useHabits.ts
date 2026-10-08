import { useCallback, useEffect, useRef, useState } from 'react';
import * as api from '../api';
import type { Habit, HabitInput } from '../types/api';

const msg = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong');

export function useHabits() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const mounted = useRef(true);
  const pending = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const list = await api.listHabits();
      if (mounted.current) setHabits(list);
    } catch (e) {
      if (mounted.current) setLoadError(msg(e));
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** Silent refresh to pick up recomputed streaks. */
  const refresh = useCallback(async () => {
    try {
      if (pending.current > 0) return;
      const list = await api.listHabits();
      // a toggle may have started while fetching; its optimistic state wins
      if (mounted.current && pending.current === 0) setHabits(list);
    } catch {
      /* keep optimistic state */
    }
  }, []);

  const create = useCallback(async (input: HabitInput) => {
    const created = await api.createHabit(input);
    setHabits((h) => [...h, created]);
  }, []);

  const update = useCallback(async (habit: Habit, input: HabitInput) => {
    const updated = await api.updateHabit(habit.id, input);
    setHabits((h) => h.map((x) => (x.id === habit.id ? updated : x)));
  }, []);

  const archive = useCallback(async (habit: Habit) => {
    setActionError(null);
    try {
      await api.archiveHabit(habit.id);
      setHabits((h) => h.filter((x) => x.id !== habit.id));
    } catch (e) {
      setActionError(`Could not archive "${habit.name}": ${msg(e)}`);
    }
  }, []);

  const toggleCheckin = useCallback(
    async (habit: Habit, date: string, index: number) => {
      const was = habit.last7[index] ?? false;
      const setAt = (value: boolean) =>
        setHabits((hs) =>
          hs.map((h) =>
            h.id === habit.id ? { ...h, last7: h.last7.map((v, i) => (i === index ? value : v)) } : h,
          ),
        );
      setActionError(null);
      setAt(!was); // optimistic
      pending.current++;
      try {
        if (was) await api.removeCheckin(habit.id, date);
        else await api.addCheckin(habit.id, date);
        pending.current--;
        void refresh();
      } catch (e) {
        pending.current--;
        setAt(was); // rollback
        setActionError(`Could not update "${habit.name}" for ${date}: ${msg(e)}`);
      }
    },
    [refresh],
  );

  return {
    habits,
    loading,
    loadError,
    actionError,
    dismissActionError: () => setActionError(null),
    reload: load,
    create,
    update,
    archive,
    toggleCheckin,
  };
}
