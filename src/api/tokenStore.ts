/**
 * The ONLY place that knows where the access token lives.
 *
 * Current design: in memory only. It is lost on reload and recovered by calling
 * POST /auth/refresh, which relies on an httpOnly refresh cookie set by the Express API.
 * That keeps the JWT out of localStorage, so an XSS bug cannot steal it from storage.
 * To change the strategy, edit this file only.
 */
let accessToken: string | null = null;

export const tokenStore = {
  get: (): string | null => accessToken,
  set: (token: string): void => {
    accessToken = token;
  },
  clear: (): void => {
    accessToken = null;
  },
};
