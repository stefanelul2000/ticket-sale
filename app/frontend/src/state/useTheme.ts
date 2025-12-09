import { create } from 'zustand';

type ThemeValues = {
  primary: string;
  secondary: string;
  background: string;
  logoUrl: string;
};

type ThemeState = ThemeValues & {
  setTheme: (t: Partial<ThemeValues>) => void;
};

export const themeDefaults: ThemeValues = {
  primary: '#ff5c8d',
  secondary: '#43d9ad',
  background: '#0b0c10',
  logoUrl: '',
};

const loadPersisted = (): Partial<ThemeValues> => {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem('ts_theme');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const useTheme = create<ThemeState>((set) => ({
  ...themeDefaults,
  ...loadPersisted(),
  setTheme: (t) =>
    set((state) => {
      const nextValues: ThemeValues = {
        primary: state.primary,
        secondary: state.secondary,
        background: state.background,
        logoUrl: state.logoUrl,
        ...t,
      };
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem('ts_theme', JSON.stringify(nextValues));
        } catch {
          // ignore
        }
      }
      return { ...state, ...t };
    }),
}));
