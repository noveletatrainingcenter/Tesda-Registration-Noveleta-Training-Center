// frontend/src/store/authStore.ts
import { create } from 'zustand';

interface User {
  id: string;
  username: string;
  role: 'admin' | 'encoder';
  full_name: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string, remember: boolean) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  // On load: check localStorage first (remembered), then sessionStorage (not remembered)
  user: (() => {
    try {
      const raw = localStorage.getItem('tesda_user') || sessionStorage.getItem('tesda_user');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  })(),
  token: localStorage.getItem('tesda_token') || sessionStorage.getItem('tesda_token'),
  isAuthenticated: !!(localStorage.getItem('tesda_token') || sessionStorage.getItem('tesda_token')),

  setAuth: (user, token, remember) => {
    if (remember) {
      localStorage.setItem('tesda_token', token);
      localStorage.setItem('tesda_user', JSON.stringify(user));
      // clear session storage in case there's a stale entry
      sessionStorage.removeItem('tesda_token');
      sessionStorage.removeItem('tesda_user');
    } else {
      sessionStorage.setItem('tesda_token', token);
      sessionStorage.setItem('tesda_user', JSON.stringify(user));
      // clear local storage in case there's a stale entry
      localStorage.removeItem('tesda_token');
      localStorage.removeItem('tesda_user');
    }
    set({ user, token, isAuthenticated: true });
  },

  clearAuth: () => {
    localStorage.removeItem('tesda_token');
    localStorage.removeItem('tesda_user');
    sessionStorage.removeItem('tesda_token');
    sessionStorage.removeItem('tesda_user');
    set({ user: null, token: null, isAuthenticated: false });
  },
}));