import { http } from './client';
import type { WeatherDay } from '@/types';

interface Items<T> {
  items: T[];
}

/**
 * The browser never talks to a weather provider and never holds a weather API key.
 * The Express API proxies and caches the provider call (key lives in the server's env).
 */
export const weatherApi = {
  forecast: async (district: string) =>
    (await http.get<Items<WeatherDay>>('/weather', { district })).items,
};
