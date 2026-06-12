import { create } from 'zustand';

export interface NotifItem {
  id: string;
  type: 'alert' | 'deadline' | 'tip';
  title: string;
  body: string;
  read: boolean;
  time: string;
}

interface NotifState {
  notifications: NotifItem[];
  setNotifications: (n: NotifItem[]) => void;
  markAllRead: () => void;
  dismiss: (id: string) => void;
  clearAll: () => void;
}

export const useNotifStore = create<NotifState>(set => ({
  notifications: [],
  setNotifications: notifications => set({ notifications }),
  markAllRead: () => set(s => ({ notifications: s.notifications.map(n => ({ ...n, read: true })) })),
  dismiss: id => set(s => ({ notifications: s.notifications.filter(n => n.id !== id) })),
  clearAll: () => set({ notifications: [] }),
}));
