import { http } from './client';
import type { Article } from '@/types';

interface Items<T> {
  items: T[];
}

export const articlesApi = {
  list: async () => (await http.get<Items<Article>>('/articles')).items,
  create: (
    input: Pick<
      Article,
      'title' | 'category' | 'cropTag' | 'summary' | 'content' | 'keyRecommendations'
    >,
  ) => http.post<Article>('/articles', input),
};
