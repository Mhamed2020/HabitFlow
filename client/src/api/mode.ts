/** 'live' = real API; 'demo' = demo data; 'demo-server-ready' = demo data, but the API is now up. */
export type ApiMode = 'live' | 'demo' | 'demo-server-ready';

/** Static builds (GitHub Pages) fall back to in-memory demo data when the API is unreachable. */
export const DEMO_FALLBACK = import.meta.env.VITE_DEMO_FALLBACK === 'true';
/** Backend origin for a separately hosted API (e.g. Render); '' = same origin (Vite proxy in dev). */
export const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

let mode: ApiMode = DEMO_FALLBACK && !API_BASE ? 'demo' : 'live';
const listeners = new Set<() => void>();

export const getApiMode = () => mode;

export function subscribeApiMode(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setApiMode(next: ApiMode) {
  if (mode === next) return;
  mode = next;
  listeners.forEach((l) => l());
}
