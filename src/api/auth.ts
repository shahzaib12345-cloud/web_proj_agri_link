import { http, refreshSession } from './client';
import { tokenStore } from './tokenStore';
import type { RegisterInput, Session, User } from '@/types';

export const authApi = {
  async login(phone: string, password: string): Promise<User> {
    const session = await http.post<Session>('/auth/login', { phone, password }, false);
    tokenStore.set(session.accessToken);
    return session.user;
  },
  async register(input: RegisterInput): Promise<User> {
    const session = await http.post<Session>('/auth/register', input, false);
    tokenStore.set(session.accessToken);
    return session.user;
  },
  /** Called on app start: restores the session from the refresh cookie, if any. */
  async restore(): Promise<User | null> {
    const session = await refreshSession();
    return session ? session.user : null;
  },
  async logout(): Promise<void> {
    try {
      await http.post<void>('/auth/logout', undefined, false);
    } finally {
      tokenStore.clear();
    }
  },
  updateMe: (
    patch: Partial<Pick<User, 'name' | 'location' | 'cropsGrown' | 'farmSizeAcres' | 'buyerType'>>,
  ) => http.patch<User>('/users/me', patch),
};
