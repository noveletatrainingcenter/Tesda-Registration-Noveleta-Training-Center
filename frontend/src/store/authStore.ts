import { create } from 'zustand';

interface User {
  id: string;
  username: string;
  email?: string;
  role: 'admin' | 'encoder';
  full_name: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: (() => {
    try {
      const raw = localStorage.getItem('tesda_user');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  })(),
  token: localStorage.getItem('tesda_token'),
  isAuthenticated: !!localStorage.getItem('tesda_token'),

  setAuth: (user, token) => {
    localStorage.setItem('tesda_token', token);
    localStorage.setItem('tesda_user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },

  clearAuth: () => {
    localStorage.removeItem('tesda_token');
    localStorage.removeItem('tesda_user');
    set({ user: null, token: null, isAuthenticated: false });
  },
}));
