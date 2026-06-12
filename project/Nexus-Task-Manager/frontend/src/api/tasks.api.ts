import client from './client';
import type { Task } from '../store/taskStore';

export const tasksApi = {
  getAll: () => client.get<{ tasks: Task[] }>('/tasks'),
  create: (data: Partial<Task>) => client.post<{ task: Task }>('/tasks', data),
  update: (id: string, data: Partial<Task>) => client.patch<{ task: Task }>(`/tasks/${id}`, data),
  delete: (id: string) => client.delete(`/tasks/${id}`),
  reorder: (orderedIds: string[]) => client.post('/tasks/reorder', { orderedIds }),
  autoSchedule: () => client.post<{ tasks: Task[] }>('/tasks/auto-schedule'),
  clearSchedule: () => client.post<{ tasks: Task[] }>('/tasks/clear-schedule'),
};
