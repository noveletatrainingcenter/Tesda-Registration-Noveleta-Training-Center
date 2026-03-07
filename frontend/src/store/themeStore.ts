// frontend/src/store/themeStore.ts
import { create } from 'zustand';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

function applyTheme(t: Theme) {
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('tesda_theme', t);
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: (() => {
    const saved = localStorage.getItem('tesda_theme') as Theme | null;
    const t = saved || 'dark';
    applyTheme(t);
    return t;
  })(),
  setTheme: (t) => {
    applyTheme(t);
    set({ theme: t });
  },
}));
