import client from './client';
import type { NotifItem } from '../store/notificationStore';

export const notificationsApi = {
  getAll: () => client.get<{ notifications: NotifItem[] }>('/notifications'),
  markAllRead: () => client.patch('/notifications/read-all'),
  dismiss: (id: string) => client.delete(`/notifications/${id}`),
  clearAll: () => client.delete('/notifications'),
};
