import { useSyncExternalStore } from 'react';
import { getApiMode, subscribeApiMode } from '../api/mode';

/** Tells the user they are looking at demo data, and offers to switch once the API is up. */
export default function DemoBanner() {
  const mode = useSyncExternalStore(subscribeApiMode, getApiMode);
  if (mode === 'live') return null;

  return (
    <div
      role="status"
      className="border-b border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
    >
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
        {mode === 'demo' ? (
          <p>
            <strong>Demo mode</strong>: the server is unreachable or waking up, so you are seeing sample data. Changes
            are not saved.
          </p>
        ) : (
          <>
            <p>
              <strong>The server is ready.</strong> You are still seeing sample data.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg bg-amber-600 px-3 py-1 font-medium text-white hover:bg-amber-700"
            >
              Load real data
            </button>
          </>
        )}
      </div>
    </div>
  );
}
