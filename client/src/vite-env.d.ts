/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Origin of a separately hosted API, e.g. https://habitflow-api.onrender.com. Unset = same origin. */
  readonly VITE_API_URL?: string;
  /** 'true' = use in-memory demo data when the API cannot be reached (static hosting). */
  readonly VITE_DEMO_FALLBACK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
