import { http } from './client';
import type { AdminStats, ProduceListing, User } from '@/types';

interface Items<T> {
  items: T[];
}

export const adminApi = {
  stats: () => http.get<AdminStats>('/admin/stats'),
  users: async () => (await http.get<Items<User>>('/admin/users')).items,
  setVerified: (id: string, verified: boolean) =>
    http.patch<User>(`/admin/users/${encodeURIComponent(id)}/verification`, { verified }),
  listings: async () => (await http.get<Items<ProduceListing>>('/admin/listings')).items,
  setApproved: (id: string, approved: boolean) =>
    http.patch<ProduceListing>(`/admin/listings/${encodeURIComponent(id)}/moderation`, {
      approved,
    }),
  removeListing: (id: string) => http.delete<void>(`/listings/${encodeURIComponent(id)}`),
};
