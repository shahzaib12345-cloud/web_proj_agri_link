import { http } from './client';
import type { MarketPrice, PriceAlert } from '@/types';

interface Items<T> {
  items: T[];
}

export const pricesApi = {
  list: async () => (await http.get<Items<MarketPrice>>('/prices')).items,
  update: (id: string, wholesalePrice: number, retailPrice: number) =>
    http.patch<MarketPrice>(`/prices/${encodeURIComponent(id)}`, { wholesalePrice, retailPrice }),
  alerts: async () => (await http.get<Items<PriceAlert>>('/price-alerts')).items,
  createAlert: (cropName: string, targetPrice: number, condition: 'above' | 'below') =>
    http.post<PriceAlert>('/price-alerts', { cropName, targetPrice, condition }),
  removeAlert: (id: string) => http.delete<void>(`/price-alerts/${encodeURIComponent(id)}`),
};
