import { create } from 'zustand';

type ThemeState = {
  primary: string;
  secondary: string;
  background: string;
  logoUrl: string;
  setTheme: (t: Partial<Omit<ThemeState, 'setTheme'>>) => void;
};

const defaults: ThemeState = {
  primary: '#ff5c8d',
  secondary: '#43d9ad',
  background: '#0b0c10',
  logoUrl: '',
  setTheme: () => undefined,
};

const loadPersisted = (): Partial<ThemeState> => {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem('ts_theme');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const useTheme = create<ThemeState>((set) => ({
  ...defaults,
  ...loadPersisted(),
  setTheme: (t) =>
    set((state) => {
      const next = { ...state, ...t };
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(
            'ts_theme',
            JSON.stringify({
              primary: next.primary,
              secondary: next.secondary,
              background: next.background,
              logoUrl: next.logoUrl,
            }),
          );
        } catch {
          // ignore
        }
      }
      return next;
    }),
}));
