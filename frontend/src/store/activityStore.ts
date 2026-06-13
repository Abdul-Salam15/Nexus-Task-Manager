import { create } from 'zustand';
import { activityApi } from '../api/activity.api';

export interface ActivityItem {
  id: string;
  text: string;
  time: string;
}

interface ActivityState {
  activity: ActivityItem[];
  setActivity: (items: ActivityItem[]) => void;
  logAction: (text: string) => void;
}

export const useActivityStore = create<ActivityState>(set => ({
  activity: [],
  setActivity: activity => set({ activity }),
  logAction: (text: string) => {
    const item: ActivityItem = { id: Date.now().toString(), text, time: new Date().toISOString() };
    set(s => ({ activity: [item, ...s.activity].slice(0, 200) }));
    activityApi.create(text).catch(() => {});
  },
}));
