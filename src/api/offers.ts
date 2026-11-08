import { http } from './client';
import type { BuyerOffer, NewOfferInput, OfferAction } from '@/types';

interface Items<T> {
  items: T[];
}

export const offersApi = {
  list: async () => (await http.get<Items<BuyerOffer>>('/offers')).items,
  create: (input: NewOfferInput) => http.post<BuyerOffer>('/offers', input),
  act: (
    id: string,
    action: OfferAction,
    details?: { counterPricePerUnit?: number; counterNote?: string },
  ) => http.patch<BuyerOffer>(`/offers/${encodeURIComponent(id)}/status`, { action, ...details }),
  rate: (id: string, rating: number, comment: string) =>
    http.post<BuyerOffer>(`/offers/${encodeURIComponent(id)}/rating`, { rating, comment }),
};
