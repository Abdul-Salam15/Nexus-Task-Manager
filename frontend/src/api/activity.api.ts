import client from './client';
import type { ActivityItem } from '../store/activityStore';

export const activityApi = {
  getAll: () => client.get<{ activity: ActivityItem[] }>('/activity'),
  create: (text: string) => client.post<{ activity: ActivityItem }>('/activity', { text }),
};
