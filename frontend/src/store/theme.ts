import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

/** Применяет класс .dark к <html>. */
export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
}

export const useTheme = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      setTheme: (theme) => { applyTheme(theme); set({ theme }); },
      toggle: () => { const next = get().theme === 'dark' ? 'light' : 'dark'; applyTheme(next); set({ theme: next }); },
    }),
    {
      name: 'crm-theme',
      onRehydrateStorage: () => (state) => { if (state) applyTheme(state.theme); },
    },
  ),
);
