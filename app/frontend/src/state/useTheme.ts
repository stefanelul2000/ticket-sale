import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark';

const current = (): ThemeMode =>
  document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';

type ThemeState = { mode: ThemeMode; toggle: () => void; setMode: (m: ThemeMode) => void };

export const useTheme = create<ThemeState>((set, get) => ({
  mode: current(),
  setMode: (mode) => {
    document.documentElement.setAttribute('data-theme', mode);
    try {
      localStorage.setItem('ts_theme_mode', mode);
    } catch {
      /* ignore */
    }
    set({ mode });
  },
  toggle: () => get().setMode(get().mode === 'dark' ? 'light' : 'dark'),
}));
