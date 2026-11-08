/** Read once. Only VITE_* values are available in the browser; never put secrets here. */
export const API_BASE_URL: string = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');
export const REQUEST_TIMEOUT_MS = 15_000;
