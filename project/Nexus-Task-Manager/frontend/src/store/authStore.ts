import { create } from 'zustand';

export interface User {
  id: string;
  fullName: string;
  email: string;
  focus: string;
  createdAt: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  updateUser: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>(set => ({
  user: null,
  accessToken: localStorage.getItem('nexus_access_token'),
  setAuth: (user, accessToken, refreshToken) => {
    localStorage.setItem('nexus_access_token', accessToken);
    localStorage.setItem('nexus_refresh_token', refreshToken);
    set({ user, accessToken });
  },
  clearAuth: () => {
    localStorage.removeItem('nexus_access_token');
    localStorage.removeItem('nexus_refresh_token');
    set({ user: null, accessToken: null });
  },
  updateUser: updates => set(s => ({ user: s.user ? { ...s.user, ...updates } : s.user })),
}));
