import { create } from 'zustand';

export interface Task {
  id: string;
  title: string;
  priority: 'High' | 'Medium' | 'Low';
  deadline: string;
  effortHours: number;
  category: string;
  status: 'Pending' | 'In Progress' | 'Done';
  scheduled: string | null;
  completedAt: string | null;
  order: number;
}

export interface TaskFilters {
  search: string;
  status: string;
  priority: string;
  category: string;
}

interface TaskState {
  tasks: Task[];
  filters: TaskFilters;
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  reorderTasks: (tasks: Task[]) => void;
  setFilters: (f: Partial<TaskFilters>) => void;
}

export const useTaskStore = create<TaskState>(set => ({
  tasks: [],
  filters: { search: '', status: '', priority: '', category: '' },
  setTasks: tasks => set({ tasks }),
  addTask: task => set(s => ({ tasks: [...s.tasks, task] })),
  updateTask: (id, updates) =>
    set(s => ({ tasks: s.tasks.map(t => (t.id === id ? { ...t, ...updates } : t)) })),
  deleteTask: id => set(s => ({ tasks: s.tasks.filter(t => t.id !== id) })),
  reorderTasks: tasks => set({ tasks }),
  setFilters: f => set(s => ({ filters: { ...s.filters, ...f } })),
}));

export function filteredTasks(tasks: Task[], filters: TaskFilters): Task[] {
  return tasks.filter(t => {
    if (filters.search && !t.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.status && t.status !== filters.status) return false;
    if (filters.priority && t.priority !== filters.priority) return false;
    if (filters.category && t.category !== filters.category) return false;
    return true;
  });
}
