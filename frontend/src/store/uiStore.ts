import { create } from 'zustand';

export type ViewName = 'dashboard' | 'tasks' | 'schedule' | 'productivity' | 'recommendations' | 'profile';

interface UiState {
  activeView: ViewName;
  sidebarOpen: boolean;
  modalEditingId: string | null;
  modalOpen: boolean;
  recPanelOpen: boolean;
  weekOffset: number;
  toasts: Toast[];
  navigate: (view: ViewName) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (v: boolean) => void;
  openModal: (id: string | null) => void;
  closeModal: () => void;
  openRecPanel: () => void;
  closeRecPanel: () => void;
  setWeekOffset: (offset: number) => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

let toastId = 0;

export const useUiStore = create<UiState>(set => ({
  activeView: 'dashboard',
  sidebarOpen: false,
  modalEditingId: null,
  modalOpen: false,
  recPanelOpen: false,
  weekOffset: 0,
  toasts: [],
  navigate: view => set({ activeView: view }),
  toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: v => set({ sidebarOpen: v }),
  openModal: id => set({ modalOpen: true, modalEditingId: id }),
  closeModal: () => set({ modalOpen: false, modalEditingId: null }),
  openRecPanel: () => set({ recPanelOpen: true }),
  closeRecPanel: () => set({ recPanelOpen: false }),
  setWeekOffset: offset => set({ weekOffset: offset }),
  addToast: t => {
    const id = String(++toastId);
    set(s => ({ toasts: [...s.toasts, { ...t, id }] }));
    setTimeout(() => set(s => ({ toasts: s.toasts.filter(x => x.id !== id) })), 3500);
  },
  removeToast: id => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}));
