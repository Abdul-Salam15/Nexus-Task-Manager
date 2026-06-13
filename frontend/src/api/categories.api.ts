import client from './client';
import type { Category } from '../store/categoryStore';

export const categoriesApi = {
  getAll: () => client.get<{ categories: Category[] }>('/categories'),
  create: (data: { name: string; icon: string }) =>
    client.post<{ category: Category }>('/categories', data),
  delete: (name: string) => client.delete(`/categories/${encodeURIComponent(name)}`),
};
