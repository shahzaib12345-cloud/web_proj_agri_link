import { http } from './client';
import type { NewListingInput, ProduceListing } from '@/types';

interface Items<T> {
  items: T[];
}

export const listingsApi = {
  // TODO(api): server-side search/filter/pagination (query: search, category, district, sort, page, limit)
  list: async () => (await http.get<Items<ProduceListing>>('/listings')).items,
  mine: async () => (await http.get<Items<ProduceListing>>('/listings/mine')).items,
  create: (input: NewListingInput) => http.post<ProduceListing>('/listings', input),
  remove: (id: string) => http.delete<void>(`/listings/${encodeURIComponent(id)}`),
  favorites: async () => (await http.get<Items<string>>('/favorites')).items,
  addFavorite: (id: string) => http.put<void>(`/favorites/${encodeURIComponent(id)}`),
  removeFavorite: (id: string) => http.delete<void>(`/favorites/${encodeURIComponent(id)}`),
  // TODO(api): POST /uploads/listing-photo (multipart) with server-side type/size checks
};
